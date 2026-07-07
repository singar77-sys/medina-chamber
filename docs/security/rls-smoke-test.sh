#!/usr/bin/env bash
# =============================================================================
# RLS Phase-1 cutover smoke test  —  docs/security/rls-hardening-runbook.md §4
# =============================================================================
# Confirms the app works under the least-privilege `app_runtime` DB role by
# exercising every DB access class. Any "permission denied" or RLS block from the
# new role shows up as a FAILED check here (and as an error in the Vercel logs).
#
#   1. Liveness            GET /api/health            (app up + external deps)
#   2. Public DB read      GET /membership/directory  (SELECT on organizations —
#                          a failed read renders 0 member links, so this is a
#                          definitive read pass/fail)
#   3. Admin auth + read   POST /api/admin/auth then
#                          GET  /api/admin/campaigns   (authenticated DB SELECT)
#   4. DB write (opt-in)   GET /api/cron/gz-sync       (idempotent INSERT/UPDATE
#                          + sync_log; OFF unless RUN_WRITE=1)
#
# USAGE (run against the PREVIEW deployment first, then prod):
#   BASE_URL="https://<preview>.vercel.app" \
#   ADMIN_PASSWORD="<CHAT_ADMIN_TOKEN>" \
#   CRON_SECRET="<CRON_SECRET>" \
#   [VERCEL_BYPASS="<protection-bypass-token>"] \
#   [RUN_WRITE=1] \
#   bash docs/security/rls-smoke-test.sh
#
# NOTES
#   * Runs in Git Bash on Windows or any bash + curl.
#   * If the preview has Vercel Deployment Protection on, requests get an SSO
#     page (HTML, not JSON). Set VERCEL_BYPASS to a "Protection Bypass for
#     Automation" token, or disable protection for the test.
#   * The write check mutates the SHARED DB via idempotent upserts (the same
#     nightly gz-sync). It's OFF by default; set RUN_WRITE=1 to include it.
#   * Exit code is 0 only if every non-skipped check passed.
# =============================================================================

set -uo pipefail

BASE_URL="${BASE_URL:?set BASE_URL to the deployment URL (e.g. https://<preview>.vercel.app)}"
BASE_URL="${BASE_URL%/}"

pass=0; fail=0
HDR=()
if [ -n "${VERCEL_BYPASS:-}" ]; then
  HDR=(-H "x-vercel-protection-bypass: ${VERCEL_BYPASS}" -H "x-vercel-set-bypass-cookie: true")
fi

ok(){ echo "  PASS  $1"; pass=$((pass+1)); }
no(){ echo "  FAIL  $1"; fail=$((fail+1)); }
sk(){ echo "  SKIP  $1"; }

echo "== RLS smoke test → ${BASE_URL} =="

# ── 1. Liveness ──────────────────────────────────────────────────────────────
echo "[1/4] liveness    GET /api/health"
code=$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "${HDR[@]}" "${BASE_URL}/api/health" 2>/dev/null)
# 200 = all deps ok, 503 = a dep down but the app+route ran. Both mean "up".
if [ "$code" = "200" ] || [ "$code" = "503" ]; then ok "health responded (HTTP $code)"; else no "health HTTP $code (app not reachable / behind auth wall?)"; fi

# ── 2. Public DB read ────────────────────────────────────────────────────────
echo "[2/4] public read GET /membership/directory"
body=$(curl -sS -m 30 "${HDR[@]}" "${BASE_URL}/membership/directory" 2>/dev/null || true)
n=$(printf '%s' "$body" | grep -oE '/membership/directory/[a-z0-9][a-z0-9-]*' | sort -u | wc -l | tr -d ' ')
if [ "${n:-0}" -ge 50 ]; then
  ok "directory rendered ${n} member links — SELECT on organizations works"
elif printf '%s' "$body" | grep -qiE 'vercel|authenticate|sign in to'; then
  no "directory returned an auth/SSO page — set VERCEL_BYPASS or disable Deployment Protection"
else
  no "directory only ${n} member links — app_runtime likely lacks SELECT, or RLS is blocking reads (check logs)"
fi

# ── 3. Admin auth + authenticated DB read ────────────────────────────────────
echo "[3/4] admin       POST /api/admin/auth  +  GET /api/admin/campaigns"
if [ -z "${ADMIN_PASSWORD:-}" ]; then
  sk "ADMIN_PASSWORD not set — skipping admin check"
else
  jar=$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/rls_jar.$$")
  lcode=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -c "$jar" "${HDR[@]}" \
    -H 'content-type: application/json' \
    --data "{\"password\":\"${ADMIN_PASSWORD}\"}" \
    "${BASE_URL}/api/admin/auth" 2>/dev/null)
  if [ "$lcode" != "200" ]; then
    no "admin login HTTP $lcode (expected 200 — wrong password, rate-limit, or auth wall)"
  else
    rcode=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' -b "$jar" "${HDR[@]}" \
      "${BASE_URL}/api/admin/campaigns" 2>/dev/null)
    if [ "$rcode" = "200" ]; then
      ok "admin campaigns read HTTP 200 — authenticated DB SELECT works"
    else
      no "admin campaigns HTTP $rcode — check Vercel logs for 'permission denied'"
    fi
  fi
  rm -f "$jar" 2>/dev/null || true
fi

# ── 4. DB write (opt-in, idempotent) ─────────────────────────────────────────
echo "[4/4] db write    GET /api/cron/gz-sync   (RUN_WRITE=${RUN_WRITE:-0})"
if [ "${RUN_WRITE:-0}" != "1" ]; then
  sk "write check off — set RUN_WRITE=1 to run the idempotent gz-sync upsert"
elif [ -z "${CRON_SECRET:-}" ]; then
  no "RUN_WRITE=1 but CRON_SECRET not set — cannot authorize the cron"
else
  out=$(curl -sS -m 120 "${HDR[@]}" -H "authorization: Bearer ${CRON_SECRET}" \
    "${BASE_URL}/api/cron/gz-sync" 2>/dev/null || true)
  if printf '%s' "$out" | grep -q '"ok":true'; then
    ok "gz-sync ok:true — INSERT/UPDATE + sync_log write works"
  else
    no "gz-sync did not report ok:true → ${out:-<no response>}"
  fi
fi

echo "== ${pass} passed, ${fail} failed =="
echo "Then check Vercel runtime logs for 'permission denied for table/schema' — expect NONE."
[ "$fail" -eq 0 ]

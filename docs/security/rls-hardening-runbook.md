# RLS Hardening — Cutover Runbook (Phase 0 + Phase 1)

Executes the recommended path in [`rls-hardening-plan.md`](./rls-hardening-plan.md).
**Phase 2 is intentionally out of scope.** Nothing here changes application code —
it's Supabase dashboard settings + one DB role + a `DATABASE_URL` swap.

**Prerequisites:** Supabase project owner access · Vercel project admin (env vars) ·
`psql` or the Supabase SQL editor · ability to trigger a preview + prod deploy.

**Project ref:** `fxmdienzextxlbafgqxd` · **Pooler host:** `aws-1-us-west-2.pooler.supabase.com`

> Order matters: do **Phase 0** first (reversible dashboard toggles), then **Phase 1**
> (create role → cut a *preview* over → smoke-test → cut prod over). Keep the
> **migration** credential (`DATABASE_URL_UNPOOLED`) on `postgres` throughout.

---

## Phase 0 — Perimeter (dashboard only, ~1 hour, no downtime)

1. **Disable the Data API.** Supabase → Project Settings → **API** → set **Exposed
   schemas** to empty (remove `public`), or disable the Data API if your plan
   offers the toggle. The app doesn't use PostgREST, so this removes the public
   anon-key read/write surface entirely.
   - **Verify:** `curl "https://fxmdienzextxlbafgqxd.supabase.co/rest/v1/organizations?select=id&apikey=<ANON_KEY>"`
     returns an error / empty (not member rows).
   - **App still works:** load the public directory and log into the portal — both
     use the direct Postgres connection, not REST, so they're unaffected.

2. **Rotate keys.** Settings → API → roll the **anon** and **service_role** keys.
   Hygiene after the prod-secrets-on-dev-disk issue (finding M2). With the Data API
   off they're inert, but rotate anyway.

3. **Enforce SSL.** Settings → Database → enable **"Enforce SSL on incoming
   connections."** Complements the app-side `ssl:"require"` (fix M1) so the DB
   rejects any plaintext attempt.
   - **Verify:** the app keeps connecting (it already forces TLS). If anything
     breaks here, it means something was connecting in plaintext — investigate
     before proceeding.

**Rollback (any step):** re-enable the Data API / restore the exposed schema /
disable Enforce SSL in the dashboard. Instant.

---

## Phase 1 — Least-privilege runtime role (~half day incl. smoke-tests)

### 1. Create the role (as owner `postgres`)

Pick a fresh password and run the script as the owner via the **direct** (unpooled)
connection or the Supabase SQL editor:

```bash
export PGPASSWORD=...   # postgres password
# put a fresh secret in the script first (replace <<STRONG_RANDOM_PASSWORD>>):
#   openssl rand -base64 32
psql "$DATABASE_URL_UNPOOLED" -f docs/security/phase1-app-runtime-role.sql
```

Run the verify queries at the bottom of the script. `app_runtime` must show
`rolsuper=f, rolcreaterole=f, rolcreatedb=f, rolbypassrls=f`, have `select` on
`public.organizations`, and **no** `usage` on the `auth` schema.

### 2. Build the app_runtime pooled connection string

Take the current `DATABASE_URL` (transaction pooler, port 6543) and swap **only**
the username prefix and password:

```
# before (owner):
postgresql://postgres.fxmdienzextxlbafgqxd:<owner-pw>@aws-1-us-west-2.pooler.supabase.com:6543/postgres?...
# after (app_runtime):
postgresql://app_runtime.fxmdienzextxlbafgqxd:<app_runtime-pw>@aws-1-us-west-2.pooler.supabase.com:6543/postgres?...
```

> ⚠ **Verify the pooler accepts the custom role.** Supavisor derives the role from
> the `.<ref>` username prefix; modern projects support custom roles on the
> transaction pooler. If a connection as `app_runtime.<ref>` on port **6543** is
> refused, fall back to the **session pooler** (port **5432**) for the runtime URL.
> Test before wiring Vercel:
> ```bash
> psql "postgresql://app_runtime.fxmdienzextxlbafgqxd:<pw>@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require" -c "select count(*) from organizations;"
> ```

### 3. Cut a PREVIEW over first (prod stays on postgres)

- In Vercel, set `DATABASE_URL` = the app_runtime string **for the Preview
  environment only**. Leave Production `DATABASE_URL` on `postgres`.
- Leave `DATABASE_URL_UNPOOLED` **unchanged** (`postgres`) in all environments —
  migrations must keep running as the owner.
- Deploy a preview and run the **smoke-test** (§4).

### 4. Smoke-test (on the preview)

**Automated:** [`rls-smoke-test.sh`](./rls-smoke-test.sh) runs the read/write checks
end to end and exits non-zero if any fail:

```bash
BASE_URL="https://<preview>.vercel.app" \
ADMIN_PASSWORD="<CHAT_ADMIN_TOKEN>" CRON_SECRET="<CRON_SECRET>" \
RUN_WRITE=1 bash docs/security/rls-smoke-test.sh
# add VERCEL_BYPASS=<token> if the preview has Deployment Protection enabled
```

It covers liveness, the public DB read (directory), admin auth + an authenticated
DB read, and the opt-in idempotent write (gz-sync). Then confirm the remaining
manual items and the logs. Exercise every access class — a missing grant surfaces
as a query error, a missing RLS policy surfaces as **0 rows**:

- [ ] **Public read** — the member directory renders with members.
- [ ] **Member read+write** — magic-link login → dashboard loads; save a profile
      change; join/leave a committee; create a hot deal; log out (session_epoch bump).
- [ ] **Paid path** — start a checkout / event registration (Stripe session creates).
- [ ] **Admin** — log into `/admin`, load stats, save pricing (write).
- [ ] **Webhooks** — replay a Stripe test event (ledger write) if feasible.
- [ ] **Cron** — hit `/api/cron/gz-sync` with the `CRON_SECRET` (bulk upsert — the
      DML-heaviest path).
- [ ] **Logs** — no `permission denied for table …` or `permission denied for
      schema …` in Vercel runtime logs.

If any check fails with `permission denied`, add the missing grant to the script
and re-run it (idempotent). If any read returns 0 rows unexpectedly on an
RLS-enabled table, that table is missing its `app_runtime_all` policy — re-run the
script's policy loop.

### 5. Promote to Production

- Set Production `DATABASE_URL` = the app_runtime string.
- Redeploy prod (or `vercel env` + trigger a deploy).
- Re-run the §4 smoke-test against prod (at least: directory, one portal login, one
  admin read, and watch logs for a few minutes).
- **Verify DB traffic is now least-privilege:** the app can't `drop`/`alter` — a
  `permission denied` on any DDL attempt is expected and correct.

### Rollback (fast, no schema change to undo)

1. Revert `DATABASE_URL` (Preview and/or Production) back to the `postgres.<ref>`
   string in Vercel and redeploy. The app is immediately back to the prior state.
2. Later, once you're confident you won't roll back, optionally remove the role:
   ```sql
   -- run as postgres; drop the permissive policies first, then the role
   do $$ declare t record; begin
     for t in select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public' and c.relkind='r' loop
       execute format('drop policy if exists app_runtime_all on public.%I;', t.relname);
     end loop; end $$;
   drop role app_runtime;
   ```

---

## Ongoing caveats

- **New RLS tables:** if a future migration does `enable row level security` on a
  new table, also add its `app_runtime_all` policy (re-run the script's policy
  loop) — otherwise the app gets 0 rows on it. New tables *without* RLS are covered
  automatically by the `alter default privileges` grants.
- **Migrations stay as owner:** never point `DATABASE_URL_UNPOOLED` at
  `app_runtime` — it has no DDL rights, so `drizzle-kit migrate` /
  `db:migrate:all` would fail. Keep it on `postgres`.
- **Password rotation:** rotating `app_runtime`'s password later =
  `alter role app_runtime with password '…';` + update the Vercel `DATABASE_URL`.

## Definition of done
- [ ] Phase 0: Data API disabled, keys rotated, Enforce SSL on — app verified working.
- [ ] Phase 1: `app_runtime` created, preview smoke-test green, prod cut over, logs clean.
- [ ] `DATABASE_URL_UNPOOLED` still `postgres`; a migration still applies cleanly.

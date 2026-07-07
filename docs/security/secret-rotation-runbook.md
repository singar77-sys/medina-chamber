# Secret Rotation Runbook (audit finding M2)

Rotates the production secrets currently stored in `.env.local`. Ordered so the
low-risk, self-healing secrets go first (build confidence) and the disruptive ones
go last (with eyes open). **Zero downtime if you follow the golden rule.**

> **First decide: rotate, or just segregate?** `.env.local` is gitignored and never
> left your disk. If you don't believe it actually leaked, the lower-risk fix is to
> **stop keeping prod secrets locally** — use separate dev/preview credentials and
> keep prod values only in Vercel. That closes the exposure with **no user impact**
> and no rotation needed. Rotate the live prod values only for belt-and-suspenders.

## The golden rule (per secret)
1. Generate/roll the **new** value (keep the old one valid where the provider allows).
2. Set it in **Vercel → Settings → Environment Variables** (Production scope).
3. **Redeploy** (env changes only apply to new deployments) — dashboard "Redeploy"
   on the latest prod deployment, or `vercel --prod`, or push a commit.
4. **Verify** (commands below).
5. **Then revoke the old value** at the provider.

Only step 1→5 out of order breaks things: the app is fine until the old value is
revoked, and by then the new one is already live.

## Prep
```bash
PROD="https://<your-prod-url>"          # the Vercel prod alias or custom domain
# If prod is behind Vercel Deployment Protection, add to every curl below:
#   -H "x-vercel-protection-bypass: <token>"
gen() { openssl rand -hex 32; }          # 64 hex chars — URL-safe, satisfies all min-lengths
```
Self-generated secrets (`ADMIN_SESSION_SECRET`, `PORTAL_AUTH_SECRET`, `CRON_SECRET`,
`CHAT_ADMIN_TOKEN`) → use `gen`. Provider keys → roll in the provider's dashboard.

---

## Batch 1 — self-healing API keys (group them, ONE redeploy)
A brief mismatch here only degrades a feature; it never hard-breaks the site. Update
all of these in Vercel, redeploy once, then verify.

| Secret | Roll it in | Mismatch degrades |
|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic console | chatbot → offline fallback |
| `UPSTASH_VECTOR_REST_TOKEN` (+ `_URL`) | Upstash console | chat → keyword search |
| `RESEND_API_KEY` | Resend dashboard | emails (magic links, notices) |
| `UPSTASH_REDIS_REST_TOKEN` (+ `_URL`) | Upstash console | rate limits → in-memory; chat sessions reset |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | admin media uploads |

**Verify** (health pings Resend, Anthropic, and Upstash Vector directly):
```bash
curl -s "$PROD/api/health" | tr ',' '\n' | grep -E 'status|ok'
# want: deps.anthropic.status="ok", deps.resend.status="ok", deps.upstashVector.status="ok"
```
Redis + Blob aren't in `/health`: send a couple chatbot messages (session continuity)
and do one admin image upload, and confirm no `permission`/`Redis`/`Blob` errors in the
Vercel runtime logs.

---

## Batch 2 — admin credentials
| Secret | Effect of rotating | Verify |
|---|---|---|
| `CHAT_ADMIN_TOKEN` | new admin **password**; live sessions keep working | log into `/admin` with the new password |
| `ADMIN_SESSION_SECRET` | **all admins logged out** (re-login) — this is the intended "kill sessions" lever | after redeploy, log into `/admin` fresh |

Do `CHAT_ADMIN_TOKEN` first (non-disruptive), then `ADMIN_SESSION_SECRET` if you also
want to force every admin session to end. Both use `gen`.

---

## Batch 3 — money & database (ONE AT A TIME, verify before the next)
- **`STRIPE_SECRET_KEY`** — roll in Stripe (create a new restricted/secret key; Stripe
  keeps the old one live until you revoke it). Set in Vercel → redeploy → **verify:**
  start a checkout (join or event registration) and confirm you reach Stripe's hosted
  page (no 500). Then revoke the old key. *(This does NOT change your Stripe **webhook**
  signing secret — that's `STRIPE_WEBHOOK_SECRET`, a separate value that lives only in
  Vercel. Leave it unless you also roll the webhook endpoint.)*
- **`DATABASE_URL` / `DATABASE_URL_UNPOOLED`** — rotate the DB password in Supabase →
  update **both** Vercel vars → redeploy → **verify:**
  ```bash
  curl -s "$PROD/membership/directory" | grep -oE '/membership/directory/[a-z0-9-]+' | sort -u | wc -l
  # want a few hundred member links (a DB failure renders 0)
  ```
  ⚠ A mismatch here is a total outage — do it alone and verify immediately.
  **Better:** you're changing `DATABASE_URL` anyway in RLS Phase 1 (→ the `app_runtime`
  role). Fold the DB-credential rotation into that cutover instead of doing it twice.
- **`CRON_SECRET`** — safe anytime: Vercel's own cron reads the same env var, so they
  stay in sync. Set in Vercel → redeploy → **verify** the next scheduled run in the
  Vercel cron logs, or trigger manually (idempotent):
  ```bash
  curl -s -H "authorization: Bearer <new-CRON_SECRET>" "$PROD/api/cron/gz-sync"   # want {"ok":true,...}
  ```

---

## Batch 4 — `PORTAL_AUTH_SECRET` (most disruptive — do last, deliberately)
This one signs member sessions, magic links, **and unsubscribe links.** Rotating it:
- logs out all logged-in members (they request a fresh magic link — minor), and
- **invalidates every unsubscribe link in already-sent emails** — a recipient clicking
  an old "unsubscribe" gets *invalid link*. That's a CAN-SPAM concern.

Only rotate it if you believe it leaked. If you do: set `gen` in Vercel → redeploy →
**verify** by requesting a magic link for a test member and completing login. Accept
(or communicate) the dead-unsubscribe-links consequence; future emails carry fresh
links signed with the new secret.

---

## Not secrets — leave alone
`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are public/publishable by design.

## After you're done
Once every prod secret is set in Vercel, **remove the prod values from `.env.local`**
and replace them with separate dev/preview credentials — that's the actual fix for M2
(prod secrets off the dev disk), rotation or not.

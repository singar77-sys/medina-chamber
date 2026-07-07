# DB Authorization Hardening Plan (audit finding I1)

**Status:** Proposed · **Author:** security audit 2026-07-03 · **Owner:** decide before Phase 1

## TL;DR

The audit flagged that Row Level Security (RLS) is enabled on every table but has
**no policies**, and the app connects as a role that **bypasses RLS** — so there is
no DB-level authorization backstop; all authorization is application-layer.

Investigation changed the shape of the fix. The naive reading ("write RLS
policies") would add **zero** security here, because:

- The runtime connects as **`postgres`** (the Supabase project owner). **Table
  owners bypass RLS** unless `FORCE ROW LEVEL SECURITY` is set — so policies would
  never apply to the app's queries.
- The app does **not** use the Supabase Data API (PostgREST): no
  `@supabase/supabase-js`, no `SUPABASE_*` env vars, no `.rpc()`. It talks raw
  Postgres through the pooler. With RLS enabled + no policies, the anon REST
  surface is already **deny-all**.

**Recommendation:** Do **Phase 0** (perimeter) and **Phase 1** (least-privilege
runtime role). Together they capture ~80% of the security value at ~20% of the
risk, and require **no application code changes**. **Defer Phase 2** (true
RLS-enforced tenant isolation) unless a compliance/review requirement demands
DB-enforced org isolation — it is invasive and the app already scopes correctly.

---

## Current state (verified 2026-07-03)

| Fact | Value |
| --- | --- |
| Runtime driver | `postgres-js` (raw wire protocol), `prepare:false`, `max:1` |
| Runtime role | `postgres.fxmdienzextxlbafgqxd` → **owner role `postgres`** (RLS-bypassing) |
| Migration role | `DATABASE_URL_UNPOOLED` (direct connection, also owner) |
| Host | `aws-1-us-west-2.pooler.supabase.com` (Supavisor pooler) |
| Supabase JS / PostgREST | **Not used** by the app (no client SDK, no `SUPABASE_*` env) |
| RLS state | `ENABLE ROW LEVEL SECURITY` on all tables (migration `0002`), **no policies** |
| TLS | now forced app-side via `ssl:"require"` (fix M1, 2026-07-03) |
| Tenant key | `organizations.id`; child tables carry `organization_id` |

### What RLS actually protects here

RLS in Postgres enforces per-*role* / per-*session-context* rules. The only
external surface it guards for this project is the **Supabase Data API**
(PostgREST/GraphQL), reachable with the project's public **anon key**. Because RLS
is enabled with no policies, that surface is currently **deny-all** — i.e. already
safe. RLS does **not** currently constrain the app (owner bypass). So the real
levers are: (a) shrink the external surface, (b) shrink the blast radius of the
app credential, and only then (c) optionally make RLS enforce app-query scoping.

---

## Phase 0 — Perimeter (do first · ~1 hour · near-zero risk · high value)

Goal: remove the external attack surface the app doesn't use, and lock the network.
All in the Supabase dashboard — **no code, no downtime**.

1. **Disable the Data API** (Settings → API → "Data API" / exposed schemas). The
   app never calls PostgREST, so disabling it neutralizes the public anon-key
   read/write surface entirely (stronger than relying on deny-all RLS). If your
   plan can't fully disable it, set **Exposed schemas** to empty (remove `public`).
2. **Keep RLS enabled** (deny-all) as belt-and-suspenders behind Phase 0.
3. **Rotate the `anon` + `service_role` keys** (Settings → API). Hygiene — they may
   have been exposed via the prod-secrets-on-dev-disk issue (finding M2). With the
   Data API off they're inert, but rotate anyway.
4. **Network:** enable project-level **"Enforce SSL"** (complements the app-side
   `ssl:"require"`), and if your plan supports it, add an **IP allowlist** /
   restrict to the pooler. Vercel functions use dynamic egress IPs, so allowlisting
   is usually impractical for the runtime — prioritize Enforce SSL.

**Verify:** `curl https://fxmdienzextxlbafgqxd.supabase.co/rest/v1/organizations?apikey=<anon>`
returns 404/disabled (not rows). App directory + portal still work (they don't use REST).

**Rollback:** re-enable the Data API in the dashboard (instant).

---

## Phase 1 — Least-privilege runtime role (do next · ~half day · moderate risk · high value)

Goal: stop the app from running as the database owner. If `DATABASE_URL` ever leaks
(finding M2), the attacker should be able to touch app data **only** — never
`DROP`/`ALTER` tables, never read Supabase's `auth`/`storage` schemas, never escalate.
**No application query changes required.**

### The RLS subtlety that makes this safe

A **non-owner** role is *subject* to RLS. With RLS enabled + no policies, a plain
non-owner role would be **denied everything** (deny-all) and the app would break.
Two ways forward:

- **Phase 1 (recommended now):** grant the new role `BYPASSRLS`. It keeps RLS as a
  deny-all perimeter for anon while the app bypasses it — you get least-privilege
  (no DDL, no cross-schema) **without touching any queries**.
- **Phase 2 (later, optional):** *remove* `BYPASSRLS` and add real policies so the
  DB enforces org-scoping on the app too.

### SQL (run as owner `postgres` via the direct/unpooled connection)

```sql
-- 1. Create the runtime role. Strong password; store ONLY in Vercel env.
create role app_runtime with login password '<<STRONG_RANDOM_PASSWORD>>';

-- 2. Grant exactly what the app needs on existing objects — DML only, no DDL.
grant usage on schema public to app_runtime;
grant select, insert, update, delete on all tables in schema public to app_runtime;
grant usage, select, update on all sequences in schema public to app_runtime;

-- 3. Make future tables/sequences (created by drizzle migrations, which run as
--    postgres) inherit the same grants automatically.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to app_runtime;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to app_runtime;

-- 4. Phase-1 choice: let the app bypass the deny-all RLS (no query refactor).
--    Remove this line in Phase 2.
alter role app_runtime bypassrls;

-- Explicitly NOT granted: create/DDL, superuser, or usage on auth/storage/etc.
-- app_runtime can read/write public.* data and nothing else.
```

### Wiring

- Point the **runtime** `DATABASE_URL` at the new role. Supavisor encodes the role
  in the username prefix: `app_runtime.fxmdienzextxlbafgqxd` (same host/db, new
  password). **Verify a custom-role pooled connection works on your Supabase plan**
  before cutover — some setups need the session pooler (port 5432) rather than the
  transaction pooler for non-`postgres` roles.
- Keep `DATABASE_URL_UNPOOLED` (migrations / `drizzle-kit`) as **`postgres`** — DDL
  must run as the owner so migrations keep working and `ALTER DEFAULT PRIVILEGES`
  keeps feeding grants to `app_runtime`.
- This naturally rotates the runtime DB secret (helps finding M2).

### Verify (on a Vercel **preview**, not prod, first)

1. Public directory renders (public reads).
2. Portal magic-link login → dashboard (member read + `session_epoch` check + logout write).
3. One admin write (e.g. save pricing) and one member write (profile save).
4. `/api/cron/gz-sync` with the CRON_SECRET (bulk upsert — the DML-heaviest path).
5. Run a migration against a scratch DB to confirm `app_runtime` inherits grants.

**Rollback:** revert the runtime `DATABASE_URL` username back to `postgres.<ref>`
(and drop `app_runtime` later). Instant, no schema change to undo.

### Risk / caveats

- Any runtime code path that silently relied on owner privileges (DDL at runtime,
  cross-schema reads) would now fail. Audit shows the app only does DML on
  `public.*`, so this should be clean — the preview smoke-test is the gate.
- Confirm `gz-sync` and reporting don't `CREATE`/`TRUNCATE` at runtime (they don't
  in the current code, but re-check before cutover).

---

## Phase 2 — RLS-enforced tenant isolation (optional · multi-day · higher risk · defense-in-depth only)

Only pursue if you want the **database** to enforce org-scoping even when app code
has a bug (a missed `where organization_id = …`). The audit found the app's
scoping is already consistent, so this is defense-in-depth, not a fix for a known
hole. It is invasive because it touches **every** authorized query path.

### Mechanism

1. Drop `BYPASSRLS` from `app_runtime` (or `alter table … force row level security`).
2. Inject request identity per transaction. With `max:1` + an explicit transaction,
   the pooled backend is pinned, so `set_config(..., true)` (transaction-local) is safe:

   ```ts
   await db.transaction(async (tx) => {
     await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
     await tx.execute(sql`select set_config('app.role',  ${role},  true)`); // 'member' | 'admin' | 'public'
     // ...queries; policies below filter on these settings
   });
   ```

3. Policies per table. Representative example for a member-owned table:

   ```sql
   alter table public.hot_deals enable row level security;
   alter table public.hot_deals force  row level security;

   -- Admin/service context sees everything.
   create policy admin_all on public.hot_deals
     for all
     using      (current_setting('app.role', true) = 'admin')
     with check (current_setting('app.role', true) = 'admin');

   -- Members are confined to their own org.
   create policy member_org on public.hot_deals
     for all
     using      (organization_id = current_setting('app.org_id', true)::uuid)
     with check (organization_id = current_setting('app.org_id', true)::uuid);
   ```

4. Public-read tables (`organizations`, `events`, `membership_tiers`, …) need a
   read policy for the `'public'` context limited to publishable rows
   (`status = 'active' and deleted_at is null`).

### Why defer

- Every read/write must run inside a context-setting transaction — a large, error-
  prone refactor across ~30 routes + cron + reporting.
- A wrong/missing `set_config` silently returns **zero rows** (fail-closed), which
  is safe but can cause confusing "data disappeared" bugs mid-rollout.
- Roll out **table-by-table behind a flag** if pursued; never all at once.

---

## Decision checklist

- [ ] **Phase 0:** Disable Data API? Rotate anon/service keys? Enforce SSL? (owner: ______)
- [ ] **Phase 1:** Approve `app_runtime` least-privilege role + `DATABASE_URL` cutover on preview → prod? (owner: ______)
- [ ] **Phase 2:** Needed at all? Trigger = compliance / external security review. (decision: ______)

## Related audit items
- **M1** (fixed): `ssl:"require"` on the runtime client — Phase 0 "Enforce SSL" complements it.
- **M2** (open): prod secrets on dev disk — Phase 1 rotates the runtime DB secret as a side effect.

-- =============================================================================
-- Phase 1 — least-privilege runtime DB role for the medina-chamber app
-- =============================================================================
-- Audit finding I1 hardening. See docs/security/rls-hardening-plan.md (strategy)
-- and docs/security/rls-hardening-runbook.md (step-by-step cutover).
--
-- WHAT THIS DOES
--   Creates `app_runtime`: a LOGIN role that can only run DML (select/insert/
--   update/delete) on public.* — NO DDL, NO superuser, NO access to Supabase's
--   auth/storage/etc schemas. The app's runtime DATABASE_URL is then pointed at
--   this role so a leaked connection string can't drop tables or escalate.
--
-- HOW TO RUN
--   ONCE per environment, as the OWNER (`postgres`), in the Supabase SQL editor
--   (or `psql "$DATABASE_URL_UNPOOLED"`). This is NOT a journaled/off-journal
--   migration — do not add it to scripts/apply-off-journal-migrations.ts.
--
-- SECRET HANDLING
--   Replace <<STRONG_RANDOM_PASSWORD>> with a fresh random password (e.g.
--   `openssl rand -base64 32`). Store it ONLY in the Vercel DATABASE_URL env var.
--   DO NOT commit the real password — keep the placeholder in git.
--
-- IDEMPOTENT: safe to re-run. Role creation is guarded; grants/policies use
-- if-not-exists / drop-then-create semantics.
-- =============================================================================

-- 1) The role — LOGIN + DML only. Created only if missing so re-runs don't error.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime with login password '<<STRONG_RANDOM_PASSWORD>>';
  end if;
end $$;

-- 2) Grants on EXISTING objects in public.
grant usage on schema public to app_runtime;
grant select, insert, update, delete on all tables    in schema public to app_runtime;
grant usage, select, update            on all sequences in schema public to app_runtime;

-- 3) FUTURE objects: drizzle-kit migrations run as `postgres` (owner), so tables
--    it creates will be owned by postgres. These default privileges auto-grant
--    the same DML to app_runtime on anything postgres creates in public later —
--    no need to re-run this script after every migration.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to app_runtime;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to app_runtime;

-- 4) RLS: app_runtime is a NON-owner, so it is subject to the deny-all RLS from
--    migration 0002 (owner `postgres` bypasses it; a non-owner does NOT). Add one
--    permissive policy per RLS-enabled table so the app keeps full row access,
--    while anon/PostgREST still hits deny-all (they get no policy).
--
--    Portable — needs no BYPASSRLS/superuser. If your `postgres` role CAN grant
--    BYPASSRLS on your plan, `alter role app_runtime bypassrls;` is a simpler
--    one-line substitute for this whole block (test it; it errors "permission
--    denied" if postgres lacks the right, in which case keep this block).
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'          -- ordinary tables
      and c.relrowsecurity = true  -- RLS-enabled (the migration-0002 set)
  loop
    execute format('drop policy if exists app_runtime_all on public.%I;', t.relname);
    execute format(
      'create policy app_runtime_all on public.%I for all to app_runtime using (true) with check (true);',
      t.relname);
  end loop;
end $$;

-- 5) Verify (run after the block above):
--    -- Attributes must NOT include Superuser / Create role / Create DB / Bypass RLS:
--    select rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
--      from pg_roles where rolname = 'app_runtime';
--    -- Can read app data:
--    select has_table_privilege('app_runtime','public.organizations','select'); -- t
--    -- CANNOT read Supabase internals (expect false / no privilege):
--    select has_schema_privilege('app_runtime','auth','usage');                 -- f
--
-- ROLLBACK (only after the app is cut BACK to the postgres DATABASE_URL):
--    -- reassign not needed (owns nothing); just revoke + drop:
--    -- drop owned by app_runtime;   -- drops the app_runtime_all policies it "owns"? No — policies are owned by table owner. Drop policies explicitly if desired.
--    -- drop role app_runtime;
-- =============================================================================

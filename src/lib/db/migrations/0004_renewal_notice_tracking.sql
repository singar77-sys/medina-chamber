-- Track which renewal-notice stage (30 / 7 days out) has been emailed for an
-- invoice, so the daily renewal cron is idempotent WITHIN a day: a re-run, a
-- retry, or a manual trigger won't re-spam members with the same notice.
--
-- Hand-applied OFF the Drizzle journal (like 0002_enable_rls + 0003). It is NOT
-- a journal entry, so `drizzle-kit migrate` (pnpm db:migrate) will NOT run it.
-- Apply it (and the other off-journal files) with:
--   pnpm db:migrate:all      (drizzle-kit migrate + scripts/apply-off-journal-migrations.ts)
-- or directly: psql "$DATABASE_URL_UNPOOLED" -f src/lib/db/migrations/0004_renewal_notice_tracking.sql
-- IF NOT EXISTS makes re-running a no-op.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS renewal_notice_sent_days integer;

-- Add the "sent_with_errors" terminal state to campaign_status.
--
-- Used by the admin campaign reset route (POST /api/admin/campaigns/[id]/reset)
-- to recover a campaign stranded in "sending" that had ALREADY reached some
-- recipients: it is moved here (never back to "draft") so it can never be
-- re-sent and double-blast those recipients.
--
-- Hand-applied like 0002_enable_rls.sql (off the drizzle journal). Apply with:
--   psql "$DATABASE_URL_UNPOOLED" -f src/lib/db/migrations/0003_campaign_sent_with_errors.sql
-- IF NOT EXISTS makes re-running a no-op. ADD VALUE cannot run inside a txn on
-- PG < 12; Supabase is PG 15+, so a direct execution is fine.

ALTER TYPE "public"."campaign_status" ADD VALUE IF NOT EXISTS 'sent_with_errors' AFTER 'sent';

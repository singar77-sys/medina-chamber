-- Three data-integrity hardening constraints surfaced by the multi-agent audit.
-- Hand-applied OFF the Drizzle journal (like 0002–0007 — `drizzle-kit migrate`
-- will NOT run it). Apply with `pnpm db:migrate:all` or directly via
-- scripts/apply-off-journal-migrations.ts. Every statement is idempotent.
--
-- Pre-checked against prod (scripts/_migrate-0008-precheck.ts):
--   • 0 duplicate (membership_id, period_start) invoices → unique index validates.
--   • 2409 event_registrations violate the identity rule but ALL carry a gz_id, so
--     the gz_id escape keeps the CHECK valid while still guarding app inserts.
--   • memberships.past_due_since absent; 1 past_due row to backfill.

-- 1. Stop the renewal cron creating a DUPLICATE renewal invoice for the same
--    (membership, period) if it double-runs (Vercel cron redelivery + a manual
--    trigger). Partial — only when both keys are present, so ad-hoc/event invoices
--    (no membership_id / period_start) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_membership_period_uniq
  ON public.invoices (membership_id, period_start)
  WHERE membership_id IS NOT NULL AND period_start IS NOT NULL;

-- 2. Every NEW (app-origin) event registration must identify a member (contact_id)
--    or a full guest (name + email). Legacy GZ-imported anonymous-attendance rows
--    are exempt via the gz_id escape — app inserts never carry a gz_id, so the
--    guard still bites where it matters. Idempotent via the pg_constraint check.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_identity_chk'
  ) THEN
    ALTER TABLE public.event_registrations
      ADD CONSTRAINT event_registrations_identity_chk
      CHECK (
        contact_id IS NOT NULL
        OR (guest_name IS NOT NULL AND guest_email IS NOT NULL)
        OR gz_id IS NOT NULL
      );
  END IF;
END $$;

-- 3. Record WHEN a membership became past_due so the lapse grace window is measured
--    from the past_due transition, not from renewal_date (a cron outage could
--    otherwise lapse a member with zero grace). Backfill existing past_due rows.
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz;

UPDATE public.memberships
  SET past_due_since = updated_at
  WHERE status = 'past_due' AND past_due_since IS NULL;

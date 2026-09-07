-- Enable Row Level Security on all public tables
-- Resolves Supabase security advisor warnings (flagged May 20, 27, Jun 2 2025)
-- Service role bypasses RLS; no policies needed for server-side-only access

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
-- committee_members and committees are DROPPED by 0011_drop_committees.sql.
-- Unguarded, these two lines made a replay of 0002 against any database that has
-- reached 0011 fail on a missing relation, which then blocked every off-journal
-- migration after it. The runner's ledger stops the replay; this guard means the
-- file is harmless even when it is run by hand out of order, and it is a no-op
-- on a database where the tables still exist.
DO $$
BEGIN
  IF to_regclass('public.committee_members') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY';
  END IF;
  IF to_regclass('public.committees') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- hot_deals — member-to-member deals / coupons (the Hot Deals module).
--
-- Off the Drizzle journal (like 0002–0004): drizzle-kit migrate does NOT run it.
-- Apply with:  pnpm db:migrate:all   (or: psql "$DATABASE_URL_UNPOOLED" -f this file)
-- CREATE TABLE / INDEX IF NOT EXISTS makes re-running a no-op.

CREATE TABLE IF NOT EXISTS public.hot_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  terms text,
  discount_label text,
  redemption_instructions text,
  deal_url text,
  starts_at date,
  ends_at date,
  is_active boolean NOT NULL DEFAULT true,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hot_deals_org_idx ON public.hot_deals (organization_id);

-- RLS parity with the rest of the schema (0002); service role bypasses it.
ALTER TABLE public.hot_deals ENABLE ROW LEVEL SECURITY;

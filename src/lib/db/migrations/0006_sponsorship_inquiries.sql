-- sponsorship_inquiries — public sponsorship-application intake + admin queue.
--
-- Off the Drizzle journal (like 0002–0005): drizzle-kit migrate does NOT run it.
-- Apply with:  pnpm db:migrate:all   (or: psql "$DATABASE_URL_UNPOOLED" -f this file)
-- CREATE TABLE IF NOT EXISTS makes re-running a no-op.

CREATE TABLE IF NOT EXISTS public.sponsorship_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  interest text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'declined')),
  staff_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsorship_inquiries ENABLE ROW LEVEL SECURITY;

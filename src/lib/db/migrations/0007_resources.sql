-- resources — staff-curated resource library (link-based).
--
-- Off the Drizzle journal (like 0002–0006): drizzle-kit migrate does NOT run it.
-- Apply with:  pnpm db:migrate:all   (or: psql "$DATABASE_URL_UNPOOLED" -f this file)
-- CREATE TABLE IF NOT EXISTS makes re-running a no-op.

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  url text NOT NULL,
  link_label text,
  is_member_only boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resources_category_idx ON public.resources (category);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

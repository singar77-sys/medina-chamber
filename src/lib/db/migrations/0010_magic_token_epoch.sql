-- Magic-link single-use: a per-contact epoch embedded in the magic-link token and
-- bumped when the link is consumed (the POST step of the verify interstitial), so a
-- link can be used exactly once — a replay (or a recovered link) is rejected.
--
-- Paired with the auto-/manual-submit interstitial on GET /api/portal/auth/verify:
-- the GET never consumes (so email-security link prefetch — SafeLinks/Mimecast —
-- can't burn the link), only the human's POST consumes + bumps this epoch.
--
-- Hand-applied OFF the Drizzle journal (like 0002–0009). Idempotent.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS magic_token_epoch integer NOT NULL DEFAULT 0;

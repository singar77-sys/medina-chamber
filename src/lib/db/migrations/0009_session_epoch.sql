-- Session revocation: a per-contact epoch embedded in the portal session token and
-- checked on every verify, so logout (or a suspected compromise) can invalidate
-- outstanding session cookies by bumping the epoch — WITHOUT rotating
-- PORTAL_AUTH_SECRET (which would log out every member at once). Previously logout
-- only cleared the cookie client-side; a copied 30-day cookie stayed valid.
--
-- Hand-applied OFF the Drizzle journal (like 0002–0008). Idempotent.
-- NOT NULL DEFAULT 0 → existing rows get 0, matching a freshly-signed token's epoch.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS session_epoch integer NOT NULL DEFAULT 0;

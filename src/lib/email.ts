/**
 * Shared email client + chamber inbox configuration.
 *
 * Previously contact/route.ts and apply/route.ts each constructed a
 * Resend instance at module scope and hardcoded the chamber inbox
 * address. Lifted here so both routes hit the same client and one env
 * var controls where notifications go.
 */

import { Resend } from "resend";

// Resend accepts a placeholder when the real key isn't configured; each
// route still short-circuits with a 500 before sending if the real key
// is missing, so this never sends with "re_placeholder" in practice.
export const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

/** Destination inbox for contact + apply form notifications. Env-overridable. */
export const CHAMBER_NOTIFY_EMAIL =
  process.env.CHAMBER_NOTIFY_EMAIL || "office@medinaohchamber.com";

/** Standard RFC-ish email format validation. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

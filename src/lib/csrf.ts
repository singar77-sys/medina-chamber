/**
 * CSRF defense-in-depth — same-origin check for cookie-authenticated,
 * state-changing requests.
 *
 * The portal session cookie is SameSite=Lax and the admin cookie is
 * SameSite=Strict, which already blocks the classic cross-site POST. This adds an
 * explicit Origin check as a SECOND layer for unsafe methods (POST/PUT/PATCH/
 * DELETE): the request's Origin must match its own Host, or an allowlisted
 * canonical/preview origin.
 *
 * Deliberately permissive in two safe ways so it never breaks legitimate traffic:
 *   - Safe (idempotent) methods — GET/HEAD/OPTIONS — are never blocked.
 *   - A request with NO Origin header falls back to the SameSite protection
 *     rather than being rejected, so same-origin navigations and RFC 8058
 *     one-click POSTs (which may omit Origin) still work. Modern browsers do
 *     send Sec-Fetch-Site even when Origin is absent, so the cross-site case
 *     is still caught below for them.
 *
 * Apply ONLY to endpoints that act on an ambient cookie credential. Purely public
 * unauthenticated endpoints (contact/apply/join/sponsorship/…) gain nothing from
 * this and are intentionally left off — anyone may POST them anyway.
 */

import { isAllowedOrigin } from "@/lib/site-url";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** 403 Response if the request is a cross-site unsafe request; null if OK to proceed. */
export function assertSameOrigin(req: Request): Response | null {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return null;

  // Browser-attested fetch metadata (a forbidden header — cross-site JS cannot
  // set or strip it): reject outright what the browser itself labels
  // cross-site. "same-site" is deliberately NOT trusted here — a sibling
  // subdomain like business.medinachamber.com is externally hosted — so it
  // falls through to the Origin checks below, as do "same-origin"/"none".
  if (req.headers.get("sec-fetch-site") === "cross-site") return forbidden();

  const origin = req.headers.get("origin");
  // No Origin header → rely on the SameSite cookie attribute already in place
  // (plus the Sec-Fetch-Site rejection above on browsers that send it).
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return forbidden();
  }

  // Primary: the Origin's host must equal the request's own Host header. This is
  // the canonical CSRF same-origin check and works in dev, prod, and previews.
  const host = req.headers.get("host");
  if (host && originHost === host) return null;

  // Fallback: honor the canonical + Vercel-preview allowlist for proxy setups
  // where the forwarded Host legitimately differs from the public origin.
  if (isAllowedOrigin(origin)) return null;

  return forbidden();
}

function forbidden(): Response {
  return Response.json({ error: "Cross-origin request blocked." }, { status: 403 });
}

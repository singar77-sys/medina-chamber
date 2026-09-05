/**
 * Dormant-portal gate.
 *
 * GrowthZone is still the live system of record for every member transaction.
 * The custom member portal is BUILT but DORMANT until the ops cutover, so every
 * /api/portal/** route must behave as if it doesn't exist: a 404 returned before
 * any session read, DB read/write, or outbound email.
 *
 * This is the same kill switch (and the same 404 body) already guarding
 * api/portal/checkout, api/join and api/events/register — factored out here so
 * the eight portal handlers share one gate instead of eight copies that can
 * drift. It is a production kill switch, not a feature flag: the comparison is
 * `=== "true"` so a typo'd Vercel value fails CLOSED.
 *
 * Usage matches the other guard helpers in these routes (assertSameOrigin,
 * limitPortal*): call it FIRST and return the response when it is non-null.
 *
 *   const dormant = portalDormant();
 *   if (dormant) return dormant;
 *
 * Page routes under /portal are gated separately in src/app/portal/layout.tsx,
 * which calls notFound() off the same env var.
 */

export function portalDormant(): Response | null {
  if (process.env.INTERNAL_TRANSACTIONS_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return null;
}

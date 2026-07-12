// NOTE: The "/api/cron/renewal" entry was removed from vercel.json — this route is
// unscheduled and dormant until the GrowthZone cutover (runRenewalEngine also has a
// RENEWALS_ENABLED kill switch). The handler is kept so the cron can be re-enabled later.
/**
 * GET /api/cron/renewal
 * ─────────────────────
 * Daily Vercel cron — runs the membership renewal lifecycle engine.
 *
 * Schedule: "0 8 * * *"  (08:00 UTC = 04:00 ET, after gz-sync at 06:00)
 * Configured in vercel.json.
 *
 * Phases each run:
 *   1. Create draft invoices for memberships renewing within 60 days
 *   2. Email 30-day renewal notice
 *   3. Email 7-day urgent notice
 *   4. Transition active → past_due (renewal date passed, unpaid)
 *   5. Transition past_due → lapsed (30-day grace period expired)
 *
 * Auth: same CRON_SECRET bearer-token pattern as gz-sync.
 */

import { NextResponse } from "next/server";
import { runRenewalEngine } from "@/lib/renewal-engine";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;

  const auth = req.headers.get("authorization");
  if (!auth) return false;

  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const provided = match[1].trim();
  if (provided.length !== secret.length) return false;

  // Timing-safe comparison
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runRenewalEngine();
    console.log("[renewal] complete:", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[renewal] fatal:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

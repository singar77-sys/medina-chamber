// NOTE: The "/api/cron/renewal" entry was removed from vercel.json — this route is
// unscheduled and dormant until the GrowthZone cutover (runRenewalEngine also has a
// RENEWALS_ENABLED kill switch). The handler is kept so the cron can be re-enabled later.
/**
 * GET /api/cron/renewal
 * ─────────────────────
 * Daily Vercel cron — runs the membership renewal lifecycle engine.
 *
 * Schedule when re-enabled: "0 8 * * *" (08:00 UTC = 04:00 ET, after gz-sync
 * at 06:00). Currently NOT in vercel.json — see the note at the top.
 *
 * Phases each run:
 *   1. Create draft invoices for memberships renewing within 60 days
 *   2. Email 30-day renewal notice
 *   3. Email 7-day urgent notice
 *   4. Transition active → past_due (renewal date passed, unpaid)
 *   5. Transition past_due → lapsed (30-day grace period expired)
 *
 * Auth: same CRON_SECRET bearer-token pattern as gz-sync
 * (shared isAuthorizedCron in src/lib/cron-auth.ts).
 */

import { NextResponse } from "next/server";
import { runRenewalEngine } from "@/lib/renewal-engine";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthorizedCron(req))) {
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

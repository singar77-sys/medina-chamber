// NOTE: The "/api/cron/join-sweep" entry was removed from vercel.json — this route is
// unscheduled and dormant until the GrowthZone cutover (it only sweeps rows that the
// dormant /api/join creates). The handler is kept so the cron can be re-enabled later.
/**
 * GET /api/cron/join-sweep
 * ────────────────────────
 * Daily Vercel cron — deletes abandoned, unpaid self-serve joins.
 *
 * /api/join writes organizations(prospect) → contacts → memberships(pending) →
 * invoices(pending) BEFORE payment, so an abandoned checkout strands those rows
 * and (because contacts.email is UNIQUE) holds the applicant's email hostage. This
 * sweep clears joins older than 48h that never paid — freeing the email and
 * clearing junk. The 48h floor is race-safe: Stripe Checkout sessions expire at
 * 24h, so a qualifying org can never still receive an activation webhook. Full
 * safety argument lives in src/lib/membership/expiry-sweep.ts.
 *
 * Schedule when re-enabled: "0 9 * * *" (09:00 UTC = 05:00 ET, after renewal
 * at 08:00). Currently NOT in vercel.json — see the note at the top.
 *
 * Auth: same CRON_SECRET bearer-token pattern as renewal + gz-sync
 * (shared isAuthorizedCron in src/lib/cron-auth.ts).
 */

import { NextResponse } from "next/server";
import { sweepAbandonedJoins } from "@/lib/membership/expiry-sweep";
import { isAuthorizedCron } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAuthorizedCron(req))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await sweepAbandonedJoins();
    console.log("[join-sweep] complete:", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[join-sweep] fatal:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

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
 * Schedule: "0 9 * * *" (09:00 UTC = 05:00 ET, after renewal at 08:00).
 * Configured in vercel.json.
 *
 * Auth: same CRON_SECRET bearer-token pattern as renewal + gz-sync.
 */

import { NextResponse } from "next/server";
import { sweepAbandonedJoins } from "@/lib/membership/expiry-sweep";

export const runtime = "nodejs";
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
    const result = await sweepAbandonedJoins();
    console.log("[join-sweep] complete:", JSON.stringify(result));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[join-sweep] fatal:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

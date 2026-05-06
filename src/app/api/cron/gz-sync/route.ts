/**
 * GET /api/cron/gz-sync
 * ─────────────────────
 * Nightly Vercel cron — syncs bundled GrowthZone member data into Supabase.
 *
 * Schedule: "0 6 * * *"  (06:00 UTC = 02:00 ET)
 *           Runs after the GitHub Actions daily scrape + Vercel deploy.
 *           Configured in vercel.json.
 *
 * Auth: Vercel automatically sends "Authorization: Bearer {CRON_SECRET}"
 *       for scheduled invocations. The same header works for manual test
 *       calls (curl, Postman, etc.).
 *
 * Required env vars:
 *   CRON_SECRET   — random secret; set in Vercel project settings
 *   DATABASE_URL  — Supabase connection string (already set for the app)
 *
 * What gets synced: organizations, categories, organization_categories.
 * What gets skipped: contacts (requires authenticated GZ admin API).
 * A sync_log row is written on every run regardless of outcome.
 */

import { NextResponse } from "next/server";
import { runGzSync } from "@/lib/gz-sync";

// Node.js runtime: required for postgres-js (used by Drizzle).
// Do NOT set runtime = "edge" here.
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

  // Timing-safe comparison — prevents remote timing attacks.
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
    const result = await runGzSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[gz-sync] fatal:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

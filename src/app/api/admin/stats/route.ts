/**
 * GET /api/admin/stats
 * ─────────────────────
 * Aggregate ChamberBot analytics — daily message counts and topic
 * histograms. Cheap read (just counters, no transcript scan).
 *
 * Query params:
 *   token=<string>     auth (also accepts Authorization: Bearer)
 *   from=YYYY-MM-DD    optional; defaults to 30 days ago
 *   to=YYYY-MM-DD      optional; defaults to today
 *
 * Response:
 *   {
 *     range: { from, to },
 *     totalMessages: number,
 *     topicsByDate: { "2026-04-22": { membership: 12, events: 7, ... } },
 *     topicTotals:  { membership: 320, events: 180, ... }
 *   }
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import { getStats } from "@/lib/chat-log";
import { healthLimiter, applyRateLimit } from "@/lib/rate-limit";

export const runtime = "edge";
export const dynamic = "force-dynamic";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const limited = await applyRateLimit(req, healthLimiter);
  if (limited) return limited;

  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? daysAgoStr(30);
  const to = url.searchParams.get("to") ?? todayStr();

  const stats = await getStats(from, to);

  return NextResponse.json({
    range: { from, to },
    ...stats,
  });
}

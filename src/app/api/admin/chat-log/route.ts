/**
 * GET /api/admin/chat-log
 * ───────────────────────
 * Lists recent ChamberBot conversations from the 90-day log store.
 * Auth-gated via CHAT_ADMIN_TOKEN.
 *
 * Query params:
 *   token=<string>                  auth (also accepts Authorization: Bearer)
 *   from=YYYY-MM-DD                 optional; defaults to 7 days ago
 *   to=YYYY-MM-DD                   optional; defaults to today
 *   topic=<ChatTopic>               optional filter
 *   limit=<number>                  optional; defaults to 100, max 500
 *
 * Response:
 *   {
 *     range: { from, to },
 *     totalKeys: number,
 *     returned: number,
 *     conversations: [ ConversationLog, ... ]
 *   }
 *
 * Conversations are returned newest-first (by updatedAt). The log
 * store is keyed by calendar day, so a range spanning many days can
 * return large payloads — use the `limit` param to page.
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import {
  listConversationKeys,
  getConversations,
} from "@/lib/chat-log";
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
  const from = url.searchParams.get("from") ?? daysAgoStr(7);
  const to = url.searchParams.get("to") ?? todayStr();
  const topicFilter = url.searchParams.get("topic");
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? "100"), 1),
    500,
  );

  const keys = await listConversationKeys(from, to);
  // mget up to the limit × 2 (some may fail to deserialize), then cut.
  const toFetch = keys.slice(0, limit * 2);
  const conversations = await getConversations(toFetch);

  const filtered = topicFilter
    ? conversations.filter((c) => c.topic === topicFilter)
    : conversations;

  const sorted = filtered.sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  return NextResponse.json({
    range: { from, to },
    totalKeys: keys.length,
    returned: Math.min(sorted.length, limit),
    conversations: sorted.slice(0, limit),
  });
}

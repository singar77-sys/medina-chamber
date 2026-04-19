/**
 * POST /api/search
 * ----------------
 * Hybrid (dense + BM25) member search backed by Upstash Vector. Returns
 * a ranked list of member slugs + scores. The client already has the
 * full members.json bundle, so we only ship slugs back.
 *
 * Request body:
 *   { q: string, topK?: number, categoryFilter?: string | null }
 *
 * Response:
 *   { results: [{ slug, name, score }] }
 *
 * Runtime: Edge. The 14 MB embeddings JSON that previously forced this
 * onto Node runtime moved to Upstash; the search lib only imports
 * members.json (388 KB) and the Upstash client.
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";
import { searchMembers } from "@/lib/semantic-search";

export const runtime = "edge";

// Force dynamic — POST handlers are dynamic by default but Next prerender
// detection can flag them; explicit is safer.
export const dynamic = "force-dynamic";

// ── Local rate limiter (the shared chat+form limits in @/lib/rate-limit
//    are tuned differently; search gets its own bucket) ────────────────
function makeSearchLimiter(): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    // 30 queries per minute per IP — generous for real browsing, rejects bots
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    prefix: "rl:search",
  });
}
const searchLimiter = makeSearchLimiter();

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
}

export async function POST(req: Request) {
  // Rate limit
  if (searchLimiter) {
    const { success } = await searchLimiter.limit(getClientIp(req));
    if (!success) {
      return new NextResponse("Too many requests — please slow down.", {
        status: 429,
      });
    }
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { q, topK, categoryFilter } =
    (body as { q?: string; topK?: number; categoryFilter?: string | null }) ?? {};

  if (typeof q !== "string" || !q.trim()) {
    return NextResponse.json({ results: [] });
  }
  if (q.length > 500) {
    return NextResponse.json(
      { error: "Query too long (max 500 chars)" },
      { status: 400 },
    );
  }

  try {
    const results = await searchMembers(q, {
      topK: typeof topK === "number" ? Math.min(Math.max(topK, 1), 50) : 24,
      categoryFilter: categoryFilter ?? null,
    });

    // Strip heavy member fields from response — client already has the
    // full directory; we only need slug + name + score.
    return NextResponse.json({
      results: results.map((r) => ({
        slug: r.member.chamberSlug,
        name: r.member.name,
        score: Number(r.score.toFixed(4)),
      })),
    });
  } catch (err) {
    // Fail gracefully — client falls back to keyword filter on members.json
    console.error("[search] error:", err);
    Sentry.captureException(err, {
      tags: { route: "search" },
      extra: { query: q.slice(0, 200), categoryFilter },
    });
    return NextResponse.json(
      { error: "Search temporarily unavailable" },
      { status: 503 },
    );
  }
}

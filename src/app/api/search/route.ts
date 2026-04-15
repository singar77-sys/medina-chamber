/**
 * POST /api/search
 * ----------------
 * Semantic member search. Blends OpenAI vector similarity with keyword
 * scoring across name/categories/description. Returns ranked member slugs.
 *
 * Request body:
 *   { q: string, topK?: number, categoryFilter?: string | null }
 *
 * Response:
 *   { results: [{ slug, name, score, vectorScore, keywordScore }] }
 *
 * Runtime: Node.js (the 14 MB embeddings JSON exceeds the Edge Runtime's
 * 4 MB function size limit).
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { searchMembers } from "@/lib/semantic-search";

// Use Node.js runtime — Edge can't fit the 14 MB embeddings bundle.
export const runtime = "nodejs";

// Force dynamic so Next.js doesn't try to prerender this.
export const dynamic = "force-dynamic";

// ── Local rate limiter (imports in @/lib/rate-limit are chat+form tuned) ──
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

// ── Handler ────────────────────────────────────────────────────────
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

    // Strip heavy member fields from response — client already has the full
    // directory, we only need slugs + debug scores.
    return NextResponse.json({
      results: results.map((r) => ({
        slug: r.member.chamberSlug,
        name: r.member.name,
        score: Number(r.score.toFixed(4)),
        vectorScore: Number(r.vectorScore.toFixed(4)),
        keywordScore: Number(r.keywordScore.toFixed(4)),
      })),
    });
  } catch (err) {
    // Fail gracefully — client will fall back to keyword filter
    console.error("[search] error:", err);
    return NextResponse.json(
      { error: "Search temporarily unavailable" },
      { status: 503 },
    );
  }
}

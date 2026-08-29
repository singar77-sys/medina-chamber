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
import * as Sentry from "@sentry/nextjs";
import { searchMembers } from "@/lib/semantic-search";
import { searchLimiter, applyRateLimit } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/body-limit";

export const runtime = "edge";

// Force dynamic — POST handlers are dynamic by default but Next prerender
// detection can flag them; explicit is safer.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, searchLimiter);
  if (limited) return limited;

  // Parse body (bounded — a search query has no business being large)
  const bounded = await readJsonBounded(req, 8 * 1024);
  if ("response" in bounded) return bounded.response;
  const body = bounded.body;

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

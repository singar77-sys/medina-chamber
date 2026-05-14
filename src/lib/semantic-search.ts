/**
 * Semantic member search — Upstash Vector hybrid query.
 *
 * The chamber's directory of 511 members is indexed in Upstash Vector
 * as a HYBRID index: BAAI/bge-large-en-v1.5 dense (1024 dims, cosine) +
 * BM25 sparse, both managed server-side. We send raw query text; Upstash
 * embeds, runs both vector and sparse search, fuses results, and returns
 * the top-K with metadata.
 *
 * This replaced an in-memory dot-product over a 14 MB embeddings JSON
 * plus a hand-rolled keyword scorer. The previous implementation forced
 * /api/search to run on Node runtime (the JSON exceeded Edge's 4 MB
 * function size limit). Edge-runtime safe now.
 */

import { getVectorIndex } from "@/lib/vector-db";
import { members, type Member } from "@/data/members";

export interface SearchResult {
  member: Member;
  score: number;
}

export interface SearchOptions {
  topK?: number;
  /** Restrict results to members in this category (applied post-ranking). */
  categoryFilter?: string | null;
  /**
   * Hard score floor. Results below this are dropped before applying the
   * adaptive relative cutoff. Use a higher value to be stricter than the
   * default. Default 0.4.
   */
  minScore?: number;
}

// Build a slug → Member lookup once. members.json is still bundled
// because pages need full member data — only the embeddings moved out.
const MEMBERS_BY_SLUG: Map<string, Member> = new Map(
  members.map((m) => [m.chamberSlug, m]),
);

/**
 * Keep results within this fraction of the top match's score. Drops the
 * long tail of weak vector-space neighbors that aren't actually relevant
 * (e.g., "roofer" → manufacturing company).
 *
 * Upstash hybrid query returns Reciprocal Rank Fusion scores that cluster
 * tightly in a small range (typical max ~0.03–0.05; differences between
 * good and bad matches are small in absolute terms but meaningful
 * relatively). So this cutoff needs to be HIGH — 0.85 keeps results within
 * 15% of the top match, which roughly aligns with "still on the same topic
 * cluster" empirically.
 *
 * Lower = more inclusive (more junk leaks in). Higher = stricter (risk of
 * dropping legitimate near-ties). Tune in this file.
 */
const RELATIVE_SCORE_CUTOFF = 0.85;

/**
 * Absolute floor regardless of relative cutoff. RRF scores rarely exceed
 * 0.05, so this is intentionally tiny — mostly a guard against the
 * degenerate "all hits are noise" case. Do NOT set this above ~0.02 or
 * you'll filter every legitimate result.
 */
const ABSOLUTE_SCORE_FLOOR = 0.005;

export async function searchMembers(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = 24,
    categoryFilter = null,
    minScore = ABSOLUTE_SCORE_FLOOR,
  } = options;

  const trimmed = query.trim();
  if (!trimmed) return [];

  const index = getVectorIndex();

  // We over-fetch when filtering by category so the post-filter doesn't
  // leave us short. 4× headroom is more than enough at chamber scale.
  const fetchK = categoryFilter ? Math.min(topK * 4, 100) : topK;

  const hits = await index.query({
    data: trimmed,
    topK: fetchK,
    includeMetadata: true,
  });

  if (hits.length === 0) return [];

  // Adaptive cutoff: max of (top_score × RELATIVE_CUTOFF) and the absolute
  // floor. Strong-match queries stay tight; vague queries don't expand into
  // unrelated members just to fill topK slots.
  const topScore = hits[0].score;
  const effectiveFloor = Math.max(topScore * RELATIVE_SCORE_CUTOFF, minScore);

  const results: SearchResult[] = [];
  for (const hit of hits) {
    if (hit.score < effectiveFloor) continue;
    const member = MEMBERS_BY_SLUG.get(String(hit.id));
    if (!member) continue;
    if (categoryFilter && !member.categories?.includes(categoryFilter)) continue;
    results.push({ member, score: hit.score });
    if (results.length >= topK) break;
  }
  return results;
}

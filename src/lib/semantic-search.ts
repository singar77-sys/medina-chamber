/**
 * Semantic member search — hybrid vector + keyword scoring.
 *
 * Loads 511 pre-computed OpenAI text-embedding-3-small vectors at module
 * scope (~14 MB JSON, ~500ms cold-start parse, instant after). Query-time
 * embedding is also via OpenAI (~100ms). Cosine similarity simplifies to
 * dot product because all vectors are unit-normalized.
 *
 * Hybrid blend:
 *   final_score = (VECTOR_WEIGHT * cosine) + (KEYWORD_WEIGHT * keyword_hit)
 * Pure vector misses exact-name queries ("Armstrong"). Pure keyword misses
 * intent queries ("someone who fixes roofs after a storm"). Blending both
 * gets us the best of both worlds.
 */

import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import embeddingsData from "@/data/member-embeddings.json";
import { members, type Member } from "@/data/members";

// ── Types ──────────────────────────────────────────────────────────
interface EmbeddingRecord {
  slug: string;
  vector: number[];
}
interface EmbeddingsFile {
  generatedAt: string;
  model: string;
  dimensions: number;
  count: number;
  embeddings: EmbeddingRecord[];
}

export interface SearchResult {
  member: Member;
  score: number;
  vectorScore: number;
  keywordScore: number;
}

export interface SearchOptions {
  topK?: number;
  /** Restrict results to members in this category (applied post-ranking). */
  categoryFilter?: string | null;
  /** 0 = pure keyword, 1 = pure vector. Default 0.7 = 70% vector weight. */
  vectorWeight?: number;
}

// ── Module state ───────────────────────────────────────────────────
const DATA = embeddingsData as EmbeddingsFile;

/** Member lookup by slug, built once at module load. */
const MEMBERS_BY_SLUG: Map<string, Member> = new Map(
  members.map((m) => [m.chamberSlug, m]),
);

/**
 * Vectors loaded into plain arrays. Keeping them as number[] rather than
 * converting to Float32Array keeps the JSON parse simple; dot-product is
 * fast enough at 511 × 1536.
 */
const EMBEDDINGS: EmbeddingRecord[] = DATA.embeddings;

// ── Math ───────────────────────────────────────────────────────────
/** Dot product of two same-length vectors. Equals cosine similarity when
 *  both inputs are unit-normalized (OpenAI embeddings are). */
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) sum += a[i] * b[i];
  return sum;
}

/** L2 normalize a vector in place. Query embeddings from OpenAI are already
 *  normalized, but we do this defensively to stay correct under other providers. */
function normalize(v: number[]): number[] {
  let mag = 0;
  for (let i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  return v.map((x) => x / mag);
}

// ── Keyword scoring ────────────────────────────────────────────────
/**
 * Returns a 0..1 score based on how well the query matches the member's
 * name, categories, and description via simple substring + word matching.
 * Used as a boost on top of vector similarity so that exact-name queries
 * always surface the right record.
 */
function keywordScore(member: Member, q: string): number {
  if (!q) return 0;
  const query = q.toLowerCase().trim();
  if (query.length < 2) return 0;
  const queryWords = query.split(/\s+/).filter((w) => w.length > 1);

  const name = (member.name || "").toLowerCase();
  const cats = (member.categories || []).join(" ").toLowerCase();
  const desc = (member.description || "").toLowerCase();
  const addr = (member.address || "").toLowerCase();

  let score = 0;

  // Exact name match = max signal
  if (name === query) return 1;
  // Name prefix or contains
  if (name.startsWith(query)) score = Math.max(score, 0.9);
  else if (name.includes(query)) score = Math.max(score, 0.75);

  // Category direct match
  if (cats.includes(query)) score = Math.max(score, 0.6);

  // All query words present in name (order-insensitive)
  const nameWordHits = queryWords.filter((w) => name.includes(w)).length;
  if (nameWordHits > 0) {
    score = Math.max(score, 0.4 + 0.3 * (nameWordHits / queryWords.length));
  }

  // Words present in categories
  const catWordHits = queryWords.filter((w) => cats.includes(w)).length;
  if (catWordHits > 0) {
    score = Math.max(score, 0.2 + 0.2 * (catWordHits / queryWords.length));
  }

  // Words present in description
  const descWordHits = queryWords.filter((w) => desc.includes(w)).length;
  if (descWordHits > 0) {
    score = Math.max(score, 0.15 + 0.15 * (descWordHits / queryWords.length));
  }

  // City match (e.g. "brunswick plumber")
  const cityWordHits = queryWords.filter((w) => addr.includes(w)).length;
  if (cityWordHits > 0) {
    score = Math.max(score, 0.1 + 0.1 * (cityWordHits / queryWords.length));
  }

  return Math.min(score, 1);
}

// ── Query embedding ────────────────────────────────────────────────
export async function embedQuery(query: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });
  return normalize(embedding);
}

// ── Main search ────────────────────────────────────────────────────
export async function searchMembers(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const {
    topK = 24,
    categoryFilter = null,
    vectorWeight = 0.7,
  } = options;

  const trimmed = query.trim();
  if (!trimmed) return [];

  const keywordWeight = 1 - vectorWeight;

  // 1. Embed query
  const queryVector = await embedQuery(trimmed);

  // 2. Score all members
  const scored: SearchResult[] = [];
  for (const rec of EMBEDDINGS) {
    const member = MEMBERS_BY_SLUG.get(rec.slug);
    if (!member) continue;

    // Apply category filter before scoring
    if (categoryFilter && !member.categories?.includes(categoryFilter)) continue;

    const vs = dotProduct(queryVector, rec.vector);
    const ks = keywordScore(member, trimmed);
    const blended = vectorWeight * vs + keywordWeight * ks;

    scored.push({
      member,
      score: blended,
      vectorScore: vs,
      keywordScore: ks,
    });
  }

  // 3. Sort by blended score descending
  scored.sort((a, b) => b.score - a.score);

  // 4. Drop low-signal tail — below 0.20 blended is usually noise
  const filtered = scored.filter((s) => s.score >= 0.2);

  return filtered.slice(0, topK);
}

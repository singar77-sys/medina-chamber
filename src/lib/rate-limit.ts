/**
 * Rate limiting with two-tier strategy:
 *
 *   1. PREFERRED — Upstash Redis sliding window (distributed, all isolates
 *      share the same counters). Activated when both UPSTASH_REDIS_REST_URL
 *      and UPSTASH_REDIS_REST_TOKEN are set in Vercel env vars.
 *
 *   2. FALLBACK — In-memory sliding window per isolate. Each Vercel Edge
 *      isolate keeps its own counters; an attacker who happens to hit a
 *      cold isolate gets a fresh budget. Imperfect, but materially better
 *      than the fall-open behavior the previous version had.
 *
 * The site previously degraded silently to "no rate limiting" when Upstash
 * Redis env vars were missing. The website-security-sentinel audit caught
 * that — we ship to production WITHOUT Upstash Redis configured today, so
 * every public POST/GET endpoint was effectively unrate-limited. The
 * in-memory fallback closes that gap until Upstash Redis is wired up.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/upstash";

// ── Upstash factory ───────────────────────────────────────────────
function makeUpstashLimiter(
  requestsPerMinute: number,
  prefix: string,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requestsPerMinute, "1 m"),
    prefix,
  });
}

// ── In-memory fallback ────────────────────────────────────────────
// Per-isolate fixed-window counter. Window resets every 60 seconds.
// Memory cost: ~32 bytes × unique-IPs × time-window. Bounded by an LRU
// eviction at MAX_BUCKETS so a flood of unique IPs can't grow the map
// indefinitely.
const MAX_BUCKETS = 5000;

interface MemBucket {
  count: number;
  resetAt: number;
}

class InMemoryLimiter {
  private buckets = new Map<string, MemBucket>();
  constructor(private readonly perMinute: number) {}

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + 60_000 };
      // LRU-ish: evict oldest when oversized.
      if (this.buckets.size >= MAX_BUCKETS) {
        const firstKey = this.buckets.keys().next().value;
        if (firstKey !== undefined) this.buckets.delete(firstKey);
      }
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    return { success: bucket.count <= this.perMinute };
  }
}

// Either-of-two limiter: prefers Upstash when available, falls back to
// in-memory. Both expose the same `.limit(key) → { success }` shape.
type SimpleLimiter = { limit(key: string): Promise<{ success: boolean }> };

function makeLimiter(requestsPerMinute: number, prefix: string): SimpleLimiter {
  const upstash = makeUpstashLimiter(requestsPerMinute, prefix);
  if (upstash) return upstash;
  return new InMemoryLimiter(requestsPerMinute);
}

// 20 req/min per IP for chat — generous enough for real users, stops bots
export const chatLimiter = makeLimiter(20, "rl:chat");

// 5 req/min per IP for forms — humans don't submit forms 5x/min
export const formLimiter = makeLimiter(5, "rl:form");

// 30 req/min per IP for semantic search — typeahead + intent searches
export const searchLimiter = makeLimiter(30, "rl:search");

// 60 req/min per IP for health probe — uptime monitors poll frequently
export const healthLimiter = makeLimiter(60, "rl:health");

/**
 * Extracts the client IP from a request. Trusts x-forwarded-for from
 * Vercel's edge (where the proxy is well-known and sets this header
 * before passing the request). Falls back to "anonymous" so every
 * downstream keying scheme still has a stable key.
 */
export function getRequestIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
}

/** Returns a 429 Response if rate limited, null if OK to proceed. */
export async function applyRateLimit(
  req: Request,
  limiter: SimpleLimiter,
): Promise<Response | null> {
  const { success } = await limiter.limit(getRequestIp(req));
  if (!success) {
    return new Response("Too many requests — please slow down.", {
      status: 429,
    });
  }
  return null;
}

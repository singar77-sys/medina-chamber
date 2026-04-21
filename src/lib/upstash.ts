/**
 * Shared Upstash Redis factory.
 *
 * rate-limit.ts, spend-cap.ts, per-ip-watch.ts, and chat-session.ts
 * previously each defined their own getRedis() helper — four near-
 * identical factories, four places to update if the SDK or env shape
 * changed. Consolidated here.
 *
 * Returns null when env vars are missing. Every caller already handles
 * that branch (in-memory fallback for local dev), so nothing breaks
 * when Upstash isn't configured.
 */

import { Redis } from "@upstash/redis";

let cached: Redis | null | undefined;

export function getRedis(): Redis | null {
  // Memoize the instance per edge isolate so we don't reconstruct on
  // every request. The Redis client is cheap but this saves a few
  // allocations and keeps a stable reference across calls.
  if (cached !== undefined) return cached;

  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    cached = null;
    return null;
  }
  cached = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return cached;
}

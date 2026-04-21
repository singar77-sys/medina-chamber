/**
 * Daily token-spend circuit breaker for the ChamberBot.
 *
 * Rate limiting stops volume per IP, but a motivated attacker rotating
 * proxies walks right past it. The only real backstop on Anthropic/OpenAI
 * bills is a hard daily token ceiling — once the chatbot burns through
 * today's budget, we short-circuit to the offline fallback until midnight
 * UTC rolls the counter.
 *
 * Two-tier strategy matching rate-limit.ts:
 *   1. PREFERRED — Upstash Redis. All edge isolates share one counter,
 *      so the cap is globally enforced.
 *   2. FALLBACK — In-memory. Per-isolate only, so the effective cap is
 *      CHAT_DAILY_TOKEN_CAP × isolate-count. Imperfect but still better
 *      than no cap. Upstash is configured in production, so this is
 *      really only exercised in local dev without env vars.
 *
 * Accounting happens in `streamText`'s `onFinish` callback, so usage is
 * recorded AFTER the response streams — we're always one request behind
 * the true total. That's fine: the worst-case over-run is one in-flight
 * request's worth of tokens, which is bounded by maxOutputTokens.
 */

import { Redis } from "@upstash/redis";

// Default ceiling chosen for a Medina-Chamber-sized site on Claude Haiku:
//   Haiku 4.5 pricing ≈ $1/M input + $5/M output tokens
//   5M tokens ≈ worst-case $25/day. Override via env to raise or lower.
const DAILY_TOKEN_CAP = Number(process.env.CHAT_DAILY_TOKEN_CAP ?? 5_000_000);

// 48h TTL so the key survives clock-skew around midnight UTC and we can
// still inspect yesterday's usage for debugging.
const KEY_TTL_SECONDS = 48 * 60 * 60;

function todayKey(): string {
  return `chat:tokens:${new Date().toISOString().slice(0, 10)}`;
}

function getRedis(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// In-memory fallback — single bucket for "today" per isolate.
let memState: { key: string; total: number } | null = null;

function getMemBucket(): { key: string; total: number } {
  const key = todayKey();
  if (!memState || memState.key !== key) {
    memState = { key, total: 0 };
  }
  return memState;
}

/**
 * Returns true if today's token total has already met or exceeded the cap.
 * Call this BEFORE invoking the model. On Redis errors, fails open
 * (returns false) — better to take the hit on one request than to 500
 * the chatbot because Upstash had a blip.
 */
export async function isOverDailyCap(): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const total = await redis.get<number>(todayKey());
      return (total ?? 0) >= DAILY_TOKEN_CAP;
    } catch {
      return false;
    }
  }
  return getMemBucket().total >= DAILY_TOKEN_CAP;
}

/**
 * Records token usage from a completed model call. Call this AFTER the
 * stream finishes (typically from streamText's onFinish). Fires and
 * forgets — never throws. If accounting fails, we log and move on
 * rather than letting it break the user-facing stream.
 */
export async function recordTokenUsage(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): Promise<void> {
  const total = (inputTokens ?? 0) + (outputTokens ?? 0);
  if (total <= 0) return;

  const redis = getRedis();
  if (redis) {
    try {
      const newTotal = await redis.incrby(todayKey(), total);
      // Set TTL only when the counter is first created today so we don't
      // push expiry out every increment.
      if (newTotal === total) {
        await redis.expire(todayKey(), KEY_TTL_SECONDS);
      }
    } catch (err) {
      console.error("[spend-cap] Redis incrby failed:", err);
    }
    return;
  }

  const bucket = getMemBucket();
  bucket.total += total;
}

export const DAILY_CAP_FOR_TESTS = DAILY_TOKEN_CAP;

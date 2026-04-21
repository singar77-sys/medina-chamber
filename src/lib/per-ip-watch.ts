/**
 * Per-IP hourly token-burn detection.
 *
 * Rate limits (rate-limit.ts) stop request volume. The daily spend cap
 * (spend-cap.ts) is the last-line backstop on the Anthropic bill. This
 * module sits between the two: it watches how many tokens a single IP
 * is burning each hour, fires a Sentry alert when one IP crosses the
 * warn threshold, and short-circuits to the offline fallback once it
 * crosses the block threshold.
 *
 *   Normal user: 5–15 questions/hour × ~2k tokens each ≈ 10–30k/hour
 *   Attacker loop: 20 req/min × 60 min × ~3k tokens   ≈ 3–4M/hour
 *   Detection gap is wide — 100k warn / 500k block catches bots while
 *   leaving breathing room for a particularly chatty real user.
 *
 * Requires Upstash Redis (same env vars as rate-limit.ts and
 * spend-cap.ts). Without it, we no-op — the daily cap still protects
 * the bill; we just lose per-IP granularity. In production Upstash is
 * configured, so this is always active there.
 */

import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

// Sized against a $20/month budget enforced by spend-cap.ts. The daily
// cap is ~2M tokens, so any single IP reaching 200k/hour is eating 10%
// of today's budget in one hour — a clear abuse signal worth blocking.
// The 100k warn threshold stays as the early-warning heads-up.
const PER_IP_WARN_TOKENS = Number(
  process.env.CHAT_PER_IP_WARN_TOKENS ?? 100_000,
);
const PER_IP_BLOCK_TOKENS = Number(
  process.env.CHAT_PER_IP_BLOCK_TOKENS ?? 200_000,
);

// 2h TTL so keys survive the hour-boundary rollover without being
// pruned mid-request, and we can still inspect the prior hour in Redis
// if an attack is in flight.
const KEY_TTL_SECONDS = 2 * 60 * 60;

function currentHourSuffix(): string {
  // YYYY-MM-DDTHH — per-hour bucket, UTC.
  return new Date().toISOString().slice(0, 13);
}

function tokenKey(ip: string): string {
  return `chat:tokens:ip:${ip}:${currentHourSuffix()}`;
}

function alertKey(ip: string): string {
  return `chat:alert:ip:${ip}:${currentHourSuffix()}`;
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

/**
 * Returns true if this IP has already burned more than the block
 * threshold in the current hour. Call before invoking the model —
 * when true, short-circuit to the offline fallback. Fails open on
 * Redis errors so a transient blip doesn't brick the chatbot.
 */
export async function isIpOverBlockThreshold(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const total = await redis.get<number>(tokenKey(ip));
    return (total ?? 0) >= PER_IP_BLOCK_TOKENS;
  } catch {
    return false;
  }
}

/**
 * Records token usage for this IP in the current hour bucket. When
 * the IP crosses the warn threshold, fires a single Sentry alert per
 * IP per hour (deduped via SET NX on a sibling key). Fire-and-forget:
 * any error is logged and swallowed so accounting never breaks the
 * user-facing stream.
 */
export async function recordIpTokenUsage(
  ip: string,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): Promise<void> {
  const total = (inputTokens ?? 0) + (outputTokens ?? 0);
  if (total <= 0) return;

  const redis = getRedis();
  if (!redis) return;

  try {
    const newTotal = await redis.incrby(tokenKey(ip), total);
    // Only set TTL on the first increment of the bucket so we don't
    // keep pushing expiry forward every request.
    if (newTotal === total) {
      await redis.expire(tokenKey(ip), KEY_TTL_SECONDS);
    }

    if (newTotal >= PER_IP_WARN_TOKENS) {
      // SET NX — returns "OK" on first write this hour, null if the
      // flag was already set. Guarantees exactly one Sentry event
      // per IP per hour no matter how fast the attacker loops.
      const firstTime = await redis.set(alertKey(ip), "1", {
        nx: true,
        ex: KEY_TTL_SECONDS,
      });
      if (firstTime === "OK") {
        const overBlock = newTotal >= PER_IP_BLOCK_TOKENS;
        Sentry.captureMessage(
          `chat: IP ${ip} burned ${newTotal} tokens this hour (threshold: ${PER_IP_WARN_TOKENS})`,
          {
            level: overBlock ? "error" : "warning",
            tags: {
              route: "chat",
              phase: "per-ip-watch",
              severity: overBlock ? "blocked" : "warned",
            },
            extra: {
              ip,
              hourTotal: newTotal,
              warnThreshold: PER_IP_WARN_TOKENS,
              blockThreshold: PER_IP_BLOCK_TOKENS,
            },
          },
        );
      }
    }
  } catch (err) {
    console.error("[per-ip-watch] Redis error:", err);
  }
}

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
 * Prefers Upstash Redis (same env vars as rate-limit.ts and
 * spend-cap.ts) so the counters are shared across edge isolates, and
 * falls back to a per-isolate in-memory bucket when Redis is missing or
 * throwing. The fallback is weaker (an attacker fanning across cold
 * isolates gets a fresh budget each time) but it is a real ceiling,
 * where the old `catch { return false }` was none at all.
 */

import * as Sentry from "@sentry/nextjs";
import { getRedis } from "@/lib/upstash";
import { envNumber } from "@/lib/spend-cap";

// Sized against a $20/month budget enforced by spend-cap.ts. The daily
// cap is ~2M tokens, so any single IP reaching 200k/hour is eating 10%
// of today's budget in one hour — a clear abuse signal worth blocking.
// The 100k warn threshold stays as the early-warning heads-up.
//
// envNumber (not a bare Number()) because these are abuse thresholds: a
// '200,000' typo parses to NaN, every `>= NaN` is false, and the block AND
// its Sentry alert silently disappear; '' parses to 0 and blocks everyone.
const PER_IP_WARN_TOKENS = envNumber("CHAT_PER_IP_WARN_TOKENS", 100_000);
const PER_IP_BLOCK_TOKENS = envNumber("CHAT_PER_IP_BLOCK_TOKENS", 200_000);

// 2h TTL so keys survive the hour-boundary rollover without being
// pruned mid-request, and we can still inspect the prior hour in Redis
// if an attack is in flight.
const KEY_TTL_SECONDS = 2 * 60 * 60;

/** Subnet-level anonymization for external telemetry (v4 → a.b.0.0). */
function anonymizeIp(ip: string): string {
  const v4 = ip.split(".");
  if (v4.length === 4) return `${v4[0]}.${v4[1]}.0.0`;
  const v6 = ip.split(":");
  if (v6.length > 2) return `${v6.slice(0, 4).join(":")}::`;
  return ip.slice(0, 8);
}

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

// ── In-memory fallback ────────────────────────────────────────────
// Per-isolate hourly totals, used when Redis is absent or throwing. Bounded
// the same way rate-limit.ts bounds its buckets so a flood of unique IPs
// can't grow the map without limit; entries are keyed by IP+hour, so a stale
// hour simply misses and starts a fresh count.
const MAX_MEM_IPS = 5000;
const memHourly = new Map<string, number>();

function memGet(ip: string): number {
  return memHourly.get(tokenKey(ip)) ?? 0;
}

function memAdd(ip: string, tokens: number): number {
  const key = tokenKey(ip);
  const next = (memHourly.get(key) ?? 0) + tokens;
  if (!memHourly.has(key) && memHourly.size >= MAX_MEM_IPS) {
    const oldest = memHourly.keys().next().value;
    if (oldest !== undefined) memHourly.delete(oldest);
  }
  memHourly.set(key, next);
  return next;
}

/**
 * Returns true if this IP has already burned more than the block
 * threshold in the current hour. Call before invoking the model —
 * when true, short-circuit to the offline fallback.
 *
 * Never throws, and never fails OPEN: a Redis error degrades to the
 * per-isolate in-memory count instead of returning false. Returning false
 * on error is what made this guard vanish during exactly the Upstash
 * outage an attacker would be happiest to hit.
 */
export async function isIpOverBlockThreshold(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const total = await redis.get<number>(tokenKey(ip));
      return (total ?? 0) >= PER_IP_BLOCK_TOKENS;
    } catch (err) {
      console.error("[per-ip-watch] Redis read failed; using in-memory count:", err);
    }
  }
  return memGet(ip) >= PER_IP_BLOCK_TOKENS;
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

  // Count locally first, unconditionally — the in-memory bucket is what
  // isIpOverBlockThreshold reads when Redis is down, so it has to be warm
  // before the outage starts, not after.
  memAdd(ip, total);

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
        // Anonymized IP only — Sentry is a third party, and the subnet is
        // enough to act on. The full address stays in Redis (2h TTL) under
        // chat:tokens:ip:* if an active attack needs the exact host.
        Sentry.captureMessage(
          `chat: IP ${anonymizeIp(ip)} burned ${newTotal} tokens this hour (threshold: ${PER_IP_WARN_TOKENS})`,
          {
            level: overBlock ? "error" : "warning",
            tags: {
              route: "chat",
              phase: "per-ip-watch",
              severity: overBlock ? "blocked" : "warned",
            },
            extra: {
              ip: anonymizeIp(ip),
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

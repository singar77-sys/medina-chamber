/**
 * Token-spend circuit breakers for the ChamberBot.
 *
 * Two layers of ceiling, both enforced as hard stops that short-circuit
 * the model call and stream the offline fallback once the budget is
 * spent:
 *
 *   MONTHLY cap  — the real budget. Sized to keep the Anthropic bill
 *                  under a fixed dollar target (default ~$20/mo on
 *                  Haiku 4.5). When this hits, the bot goes offline
 *                  until the calendar month turns over.
 *
 *   DAILY cap    — a secondary tripwire at roughly 10-15% of the
 *                  monthly budget. Any single day crossing this is
 *                  clearly abnormal — catches abuse fast without
 *                  eating a big chunk of the monthly budget first.
 *
 * Plus a WARN alert that fires once per month when usage crosses a
 * fraction of the monthly cap (default 80%). Routes through Sentry
 * so the existing phase=spend-cap alert rule emails Mark without any
 * rule changes.
 *
 * Storage: Upstash Redis (preferred, shared across edge isolates) with
 * in-memory fallback for local dev. Same two-tier pattern as
 * rate-limit.ts and per-ip-watch.ts.
 *
 * Accounting happens in streamText's onFinish callback, so usage is
 * recorded AFTER the response streams — we're always one request
 * behind the true total. Worst-case over-run is one in-flight
 * request's worth of tokens, bounded by maxOutputTokens.
 */

import { Redis } from "@upstash/redis";
import * as Sentry from "@sentry/nextjs";

// Haiku 4.5 pricing (~Jan 2026): $1/M input, $5/M output, cached input
// reads at $0.10/M. Blended chamber usage with prompt caching lands
// around $1-1.50 per million tokens, so 15M ≈ $20/month. Override via
// env if pricing shifts or the chamber wants a different budget.
const MONTHLY_TOKEN_CAP = Number(process.env.CHAT_MONTHLY_TOKEN_CAP ?? 15_000_000);

// Daily tripwire. ~13% of monthly — a legit heavy-use day won't touch
// this, but an abuse burst gets caught within hours instead of at
// month-end.
const DAILY_TOKEN_CAP = Number(process.env.CHAT_DAILY_TOKEN_CAP ?? 2_000_000);

// Early-warning fraction of the monthly cap. At 80%, Mark gets a
// Sentry email with time to investigate before the hard stop kicks in.
const MONTHLY_WARN_FRACTION = Number(process.env.CHAT_MONTHLY_WARN_FRACTION ?? 0.8);

const DAILY_TTL_SECONDS = 48 * 60 * 60;       // 2 days
const MONTHLY_TTL_SECONDS = 40 * 24 * 60 * 60; // 40 days — survives month rollover

function todayKey(): string {
  return `chat:tokens:${new Date().toISOString().slice(0, 10)}`;
}

function monthKey(): string {
  return `chat:tokens:monthly:${new Date().toISOString().slice(0, 7)}`;
}

function monthWarnFiredKey(): string {
  return `chat:alert:monthly-warn:${new Date().toISOString().slice(0, 7)}`;
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

// In-memory fallback — single bucket per period per isolate.
let memDaily: { key: string; total: number } | null = null;
let memMonthly: { key: string; total: number } | null = null;

function getMemBucket(
  which: "daily" | "monthly",
): { key: string; total: number } {
  const key = which === "daily" ? todayKey() : monthKey();
  const ref = which === "daily" ? memDaily : memMonthly;
  if (!ref || ref.key !== key) {
    const fresh = { key, total: 0 };
    if (which === "daily") memDaily = fresh;
    else memMonthly = fresh;
    return fresh;
  }
  return ref;
}

/**
 * Returns true if today's token total has already met or exceeded the
 * daily cap. Fails open on Redis errors — better to take one request's
 * cost than 500 the chatbot over an Upstash blip.
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
  return getMemBucket("daily").total >= DAILY_TOKEN_CAP;
}

/**
 * Returns true if this calendar month's token total has met or exceeded
 * the monthly cap. Once true, the bot serves offline fallback until the
 * next UTC month rollover — this is the real budget ceiling.
 */
export async function isOverMonthlyCap(): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const total = await redis.get<number>(monthKey());
      return (total ?? 0) >= MONTHLY_TOKEN_CAP;
    } catch {
      return false;
    }
  }
  return getMemBucket("monthly").total >= MONTHLY_TOKEN_CAP;
}

/**
 * Records token usage from a completed model call against both the
 * daily and monthly counters. Also fires a Sentry warn event once per
 * month when the monthly counter first crosses the warn fraction
 * (dedupe via SET NX on a sibling key, so repeated crossings only
 * alert once per calendar month).
 *
 * Fire-and-forget: never throws. Persistence failures log and move on.
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
      const newDaily = await redis.incrby(todayKey(), total);
      if (newDaily === total) {
        await redis.expire(todayKey(), DAILY_TTL_SECONDS);
      }

      const newMonthly = await redis.incrby(monthKey(), total);
      if (newMonthly === total) {
        await redis.expire(monthKey(), MONTHLY_TTL_SECONDS);
      }

      // Early-warning alert when monthly usage first crosses the warn
      // threshold. SET NX guarantees exactly one Sentry event per
      // calendar month regardless of how many requests trip the line.
      const warnThreshold = MONTHLY_TOKEN_CAP * MONTHLY_WARN_FRACTION;
      if (newMonthly >= warnThreshold) {
        const firstTime = await redis.set(monthWarnFiredKey(), "1", {
          nx: true,
          ex: MONTHLY_TTL_SECONDS,
        });
        if (firstTime === "OK") {
          Sentry.captureMessage(
            `chat: monthly token usage at ${Math.round(
              (newMonthly / MONTHLY_TOKEN_CAP) * 100,
            )}% of cap (${newMonthly.toLocaleString()} / ${MONTHLY_TOKEN_CAP.toLocaleString()})`,
            {
              level: "warning",
              tags: {
                route: "chat",
                phase: "spend-cap",
                severity: "monthly-warn",
              },
              extra: {
                monthlyTotal: newMonthly,
                monthlyCap: MONTHLY_TOKEN_CAP,
                warnFraction: MONTHLY_WARN_FRACTION,
              },
            },
          );
        }
      }
    } catch (err) {
      console.error("[spend-cap] Redis incrby failed:", err);
    }
    return;
  }

  getMemBucket("daily").total += total;
  getMemBucket("monthly").total += total;
}

export const DAILY_CAP_FOR_TESTS = DAILY_TOKEN_CAP;
export const MONTHLY_CAP_FOR_TESTS = MONTHLY_TOKEN_CAP;

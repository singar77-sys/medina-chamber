/**
 * Token-spend admission control for the ChamberBot.
 *
 * WHAT THIS GUARANTEES, PRECISELY. These are TOKEN ceilings, and the only
 * thing they promise is that admitted requests never RESERVE more tokens than
 * the cap allows. They are not a dollar guarantee: token prices change, a
 * cached input token costs a tenth of an uncached one, and a provider's usage
 * report is the only thing we ever see. Read the caps as "roughly $X/month at
 * today's Haiku pricing", never as "the bill cannot exceed $X".
 *
 * Two ceilings, both enforced as hard stops that short-circuit the model call
 * and stream the offline fallback once the budget is spent:
 *
 *   MONTHLY cap  — the real budget. Sized to keep the Anthropic bill near a
 *                  fixed dollar target (default ~$20/mo on Haiku 4.5). When
 *                  this hits, the bot goes offline until the calendar month
 *                  turns over.
 *
 *   DAILY cap    — a secondary tripwire at roughly 10-15% of the monthly
 *                  budget. Any single day crossing this is clearly abnormal —
 *                  catches abuse fast without eating a big chunk of the
 *                  monthly budget first.
 *
 * Plus a WARN alert that fires once per month when usage crosses a fraction of
 * the monthly cap (default 80%). Routes through Sentry so the existing
 * phase=spend-cap alert rule emails Mark without any rule changes.
 *
 * ── RESERVE, THEN SETTLE ──────────────────────────────────────────
 *
 * The caps used to be enforced by READING a counter before generation and
 * INCREMENTING it after. That is check-then-act, and it does not bound
 * anything under concurrency: with the counter at 99 and a cap of 100, twenty
 * simultaneous requests all read 99, all decide they are under the cap, and
 * all run. The over-run is not "one in-flight request" (which is what the
 * comment here used to claim) — it is however many requests happen to be in
 * flight, times whatever each one spends.
 *
 * So admission now RESERVES. A request claims a conservative allowance in
 * shared storage BEFORE the model call, atomically, and the claim itself
 * decides whether the request runs:
 *
 *   reserveTokens()      INCRBY on an outstanding-ledger bucket. INCRBY is
 *                        atomic and returns the POST-increment total, so
 *                        concurrent claimants each get a distinct running
 *                        total and exactly the ones that fit are admitted.
 *   settleReservation()  credits the provider's real usage to the period
 *                        counters, then releases the allowance. Exactly once
 *                        per admitted request, however the request ended.
 *
 * Reservations EXPIRE. Each bucket carries a TTL and only the last
 * RESERVE_BUCKETS buckets are counted, so a request that is abandoned without
 * ever settling (isolate torn down mid-stream, say) stops consuming budget
 * within a few minutes instead of holding it until the period rolls over.
 * That expiry is a backstop for lost work, NOT the normal release path — the
 * route settles explicitly, including when the client disconnects.
 *
 * Storage: Upstash Redis (preferred, shared across edge isolates) with a
 * per-isolate in-memory fallback. Same two-tier pattern as rate-limit.ts and
 * per-ip-watch.ts.
 *
 * ⚠ THE FALLBACK IS PER INSTANCE. When Upstash is not configured at all, both
 * the settled counters and the outstanding ledger live in module scope, so
 * every edge isolate enforces its OWN cap. N warm isolates means up to N times
 * the cap. That is a real ceiling and far better than none, but it is not a
 * global one and nothing here should be read as claiming otherwise. Configure
 * Upstash in every environment that spends money.
 */

import * as Sentry from "@sentry/nextjs";
import { getRedis } from "@/lib/upstash";

// Env caps are the only thing between abuse and the Anthropic bill, so a
// typo must not disarm them: '15,000,000' would parse to NaN (every `>= cap`
// false, budget gone) and '' to 0 (bot offline from the first request).
// Anything that isn't a finite positive number falls back to the default and
// says so once at module load.
// Exported because per-ip-watch.ts needs the identical guarantee for its own
// two thresholds — it used a bare Number() and had exactly these two bugs.
export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.error(
      `[chat-budget] ${name}="${raw}" is not a positive number; using ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

// Haiku 4.5 pricing (~Jan 2026): $1/M input, $5/M output, cached input
// reads at $0.10/M. Blended chamber usage with prompt caching lands
// around $1-1.50 per million tokens, so 15M ≈ $20/month at that blend.
// Override via env if pricing shifts or the chamber wants a different budget.
const MONTHLY_TOKEN_CAP = envNumber("CHAT_MONTHLY_TOKEN_CAP", 15_000_000);

// Daily tripwire. ~13% of monthly — a legit heavy-use day won't touch
// this, but an abuse burst gets caught within hours instead of at
// month-end.
const DAILY_TOKEN_CAP = envNumber("CHAT_DAILY_TOKEN_CAP", 2_000_000);

// Early-warning fraction of the monthly cap. At 80%, Mark gets a
// Sentry email with time to investigate before the hard stop kicks in.
const MONTHLY_WARN_FRACTION = envNumber("CHAT_MONTHLY_WARN_FRACTION", 0.8);

// What one chat turn is allowed to cost, claimed up front. It must be an
// OVER-estimate: reserving less than a request can spend puts the over-run
// back, one request at a time. The chamber system prompt plus the events and
// member blocks run ~6-9k input tokens, the output is capped at 750, and a
// turn also pays for an occasional topic-classification call (~110 tokens).
// 12k leaves headroom for a long transcript without being so large that
// normal concurrency starves the cap.
//
// Over-reserving costs nothing in dollars — the allowance is handed straight
// back at settle time and only the provider's real usage is kept.
const REQUEST_ALLOWANCE_TOKENS = envNumber("CHAT_REQUEST_ALLOWANCE_TOKENS", 12_000);

const DAILY_TTL_SECONDS = 48 * 60 * 60;       // 2 days
const MONTHLY_TTL_SECONDS = 40 * 24 * 60 * 60; // 40 days — survives month rollover

// The outstanding ledger is bucketed by wall-clock minute. A reservation is
// counted against the caps while its bucket is one of the newest
// RESERVE_BUCKETS, so an abandoned reservation is reclaimed between 2 and 3
// minutes after it was placed — comfortably longer than any chat generation,
// short enough that a torn-down isolate cannot hold budget hostage.
const RESERVE_BUCKET_SECONDS = 60;
const RESERVE_BUCKETS = 3;
// One bucket of slack past the read window so a key never vanishes from Redis
// while it is still being counted.
const RESERVE_TTL_SECONDS = RESERVE_BUCKET_SECONDS * (RESERVE_BUCKETS + 1);

function todayKey(): string {
  return `chat:tokens:${new Date().toISOString().slice(0, 10)}`;
}

function monthKey(): string {
  return `chat:tokens:monthly:${new Date().toISOString().slice(0, 7)}`;
}

function monthWarnFiredKey(): string {
  return `chat:alert:monthly-warn:${new Date().toISOString().slice(0, 7)}`;
}

/** The bucket a reservation placed right now belongs to. */
function currentReserveBucket(): number {
  return Math.floor(Date.now() / (RESERVE_BUCKET_SECONDS * 1000));
}

function reserveKey(bucket: number): string {
  return `chat:reserved:${bucket}`;
}

/**
 * Every bucket still counted against the caps, newest first.
 *
 * The window starts one bucket in the FUTURE, and that is not an off-by-one.
 * A request whose key lands in bucket `b` used to read only `b`, `b-1`, `b-2`,
 * so a request claiming in `b+1` microseconds later was invisible to it and
 * both could be admitted into the last remaining slot. The window is
 * sub-millisecond either side of a minute tick and the cost was one extra
 * allowance, but the fix is one more key in an MGET we were already issuing.
 * (The reverse direction was never a problem: the `b+1` request reads `b`.)
 *
 * The extra bucket does not stretch the reclaim window — a bucket is still
 * dropped once `current` has moved RESERVE_BUCKETS past it — and it stays
 * inside RESERVE_TTL_SECONDS, which is sized off RESERVE_BUCKETS + 1 for
 * exactly this kind of slack.
 */
function activeReserveKeys(): string[] {
  const current = currentReserveBucket();
  return Array.from({ length: RESERVE_BUCKETS + 1 }, (_, i) =>
    reserveKey(current + 1 - i),
  );
}

function toCount(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

// ── Redis health (fail SAFE, not fail open) ───────────────────────
//
// These caps are the only ceiling on an anonymous endpoint that spends real
// money per request, so a Redis error must never mean "no ceiling". The
// previous `catch { return false }` did exactly that: an Upstash outage
// skipped BOTH the Redis read and the in-memory bucket below it, and
// recordTokenUsage's own catch meant nothing was counted anywhere. Net
// effect during an outage: unlimited paid generation.
//
// Now a failed read falls through to the per-isolate in-memory ledger (which
// is always kept current — see recordTokenUsage), and after a sustained run
// of failures we treat the budget as UNKNOWN AND THEREFORE EXHAUSTED. The
// route already handles that by streaming its offline fallback at 200, so
// the chatbot degrades to canned links instead of burning unmetered tokens.
// Only the paid AI generation degrades; the rest of the site is untouched.
const REDIS_FAILURE_TRIP = 5;
let consecutiveRedisFailures = 0;
let redisFailureWarned = false;

function noteRedisOk(): void {
  consecutiveRedisFailures = 0;
  redisFailureWarned = false;
}

function noteRedisFailure(op: string, err: unknown): void {
  consecutiveRedisFailures++;
  if (!redisFailureWarned) {
    redisFailureWarned = true;
    console.error(`[spend-cap] Redis ${op} failed; degrading to in-memory:`, err);
  }
}

/** True once Redis has failed enough times in a row that we can't claim to know the spend. */
function budgetUnknown(): boolean {
  return consecutiveRedisFailures >= REDIS_FAILURE_TRIP;
}

/**
 * Why admission was refused, for the caller's alerting.
 *
 * A refusal collapses two very different situations — "the budget is
 * genuinely spent" and "Redis is down so we must ASSUME it is spent" —
 * because the route's handling of both is identical (serve the offline
 * fallback). The alert is not identical: paging "monthly budget exhausted,
 * offline until next month" in the middle of an Upstash outage points the
 * on-call at the wrong system at the worst moment. Read this immediately
 * after a refusal to tell them apart.
 */
export function isBudgetUnknown(): boolean {
  return budgetUnknown();
}

// ── In-memory fallback ────────────────────────────────────────────
// Single settled bucket per period per isolate, plus the outstanding ledger
// keyed exactly like its Redis counterpart. PER ISOLATE — see the file header.
let memDaily: { key: string; total: number } | null = null;
let memMonthly: { key: string; total: number } | null = null;
const memOutstanding = new Map<string, { total: number; expiresAt: number }>();

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

/** Drop reservations whose bucket has aged out. This is the reclaim path. */
function pruneMemOutstanding(): void {
  const now = Date.now();
  const live = new Set(activeReserveKeys());
  for (const [key, entry] of memOutstanding) {
    if (entry.expiresAt <= now || !live.has(key)) memOutstanding.delete(key);
  }
}

function memReserve(key: string, amount: number): number {
  pruneMemOutstanding();
  const entry = memOutstanding.get(key) ?? {
    total: 0,
    expiresAt: Date.now() + RESERVE_TTL_SECONDS * 1000,
  };
  entry.total += amount;
  memOutstanding.set(key, entry);
  return entry.total;
}

function memRelease(key: string, amount: number): void {
  const entry = memOutstanding.get(key);
  if (!entry) return;
  entry.total -= amount;
  if (entry.total <= 0) memOutstanding.delete(key);
}

/** Outstanding tokens across every live bucket, optionally excluding one. */
function memOutstandingTotal(exclude?: string): number {
  pruneMemOutstanding();
  let sum = 0;
  for (const [key, entry] of memOutstanding) {
    if (key === exclude) continue;
    sum += entry.total;
  }
  return sum;
}

// ── Reservations ──────────────────────────────────────────────────

/** A claim on the budget, held for the life of one request. */
export interface BudgetReservation {
  /** Tokens set aside up front; the amount handed back at settle time. */
  readonly allowance: number;
  /** The outstanding-ledger bucket the allowance was placed in. */
  readonly key: string;
  /**
   * WHICH ledger actually holds this claim — Redis, or this isolate's memory.
   *
   * Not bookkeeping: settling against the wrong backend corrupts the other
   * one. A reservation that fell back to memory because the Redis INCRBY
   * threw used to be indistinguishable from a Redis-backed one, and settling
   * it DECRBY'd a bucket it had never contributed to — cancelling a DIFFERENT
   * request's live claim (a real 500-token claim went straight to 0), and, if
   * the arithmetic had gone negative, taking every concurrent claim in that
   * minute with it. Settle against the ledger you claimed from, always.
   */
  readonly redisHeld: boolean;
  /**
   * Flipped by settleReservation. The route settles from several places (the
   * model finished, the client disconnected, the provider errored) and only
   * the first of those may count — double-settling would credit the spend
   * twice AND release an allowance that is no longer held.
   */
  settled: boolean;
}

export type ReserveResult =
  | { admitted: true; reservation: BudgetReservation }
  | { admitted: false; reason: "monthly" | "daily" | "unknown" };

/**
 * Claim `allowance` tokens against both ceilings before generation starts.
 *
 * Returns `admitted: false` when admitting this request would push either
 * ceiling past its cap, or when Redis has been failing long enough that we
 * cannot claim to know the spend. Never throws.
 *
 * Every admitted result MUST be handed to settleReservation exactly once, on
 * every exit path the request has. Forgetting one leaks the allowance until
 * its bucket ages out, which costs availability (a smaller effective budget),
 * never money.
 */
export async function reserveTokens(
  allowance: number = REQUEST_ALLOWANCE_TOKENS,
): Promise<ReserveResult> {
  const amount = Math.max(1, Math.floor(allowance));
  const key = reserveKey(currentReserveBucket());

  const redis = getRedis();
  if (redis) {
    // The decision, once made, is FINAL. It is computed inside the try below
    // and acted on outside it, because everything after the decision is
    // cleanup — and cleanup that throws must not be able to reopen a verdict
    // that has already been reached. See the release below for what happened
    // when it could.
    let decision: ReserveResult | null = null;

    try {
      // 1. Claim FIRST. INCRBY is atomic and returns the post-increment
      //    total, so concurrent claimants each see a distinct running total
      //    and exactly the ones that still fit under the cap are admitted.
      //    Reading before claiming is what let twenty requests through at
      //    99 of 100.
      const mine = await redis.incrby(key, amount);
      if (mine === amount) await redis.expire(key, RESERVE_TTL_SECONDS);

      // 2. Read the settled counters and the OTHER outstanding buckets
      //    AFTER the claim, never before. A settle landing in between has
      //    already been counted into `mine`, so reading late can only ever
      //    over-count — the safe direction.
      const others = activeReserveKeys().filter((k) => k !== key);
      const values = await redis.mget<Array<number | null>>([
        todayKey(),
        monthKey(),
        ...others,
      ]);
      // Redis answered both commands, so the budget is genuinely readable and
      // the failure counter should reset. Deliberately NOT moved below the
      // release: a DECRBY that fails while handing a refused claim back does
      // not make the number we just read any less true.
      noteRedisOk();

      const settledDaily = toCount(values[0]);
      const settledMonthly = toCount(values[1]);
      const outstanding =
        mine + values.slice(2).reduce<number>((sum, v) => sum + toCount(v), 0);

      const reason = refusalReason(settledDaily, settledMonthly, outstanding);
      decision = reason
        ? { admitted: false, reason }
        : {
            admitted: true,
            reservation: { allowance: amount, key, settled: false, redisHeld: true },
          };
    } catch (err) {
      noteRedisFailure("reserve", err);
      if (budgetUnknown()) return { admitted: false, reason: "unknown" };
      // Fall through to the in-memory ledger rather than admitting blind.
      // Anything already claimed in Redis above ages out on its own TTL.
    }

    if (decision) {
      if (!decision.admitted) {
        // Hand the refused claim straight back, best effort, in its OWN
        // try/catch. This release used to sit inside the try above, where a
        // Redis error threw the refusal away and fell through to the
        // in-memory ledger — which then ADMITTED the request that had just
        // been refused. It could not even self-limit, because noteRedisOk()
        // above resets the consecutive-failure counter on every request, so
        // the "unknown" trip never fired. Measured: cap 100, counter at
        // 100,000, DECRBY throwing — 10 of 10 requests admitted.
        //
        // Failing to return a claim costs availability for one bucket (the
        // TTL reclaims it within three minutes). Failing to honour a refusal
        // costs money, without limit, for as long as Redis misbehaves.
        try {
          await releaseFromRedis(redis, key, amount);
        } catch (err) {
          noteRedisFailure("refused claim release", err);
        }
      }
      return decision;
    }
  }

  // In-memory path. JS is single-threaded, so claim-then-check needs no
  // further ordering care here: nothing can interleave between the two.
  const mine = memReserve(key, amount);
  const outstanding = mine + memOutstandingTotal(key);
  const reason = refusalReason(
    getMemBucket("daily").total,
    getMemBucket("monthly").total,
    outstanding,
  );
  if (reason) {
    memRelease(key, amount);
    return { admitted: false, reason };
  }
  // redisHeld: false — this claim exists ONLY in this isolate's map, and
  // settling it against Redis would decrement a bucket it never touched.
  return {
    admitted: true,
    reservation: { allowance: amount, key, settled: false, redisHeld: false },
  };
}

/**
 * Monthly is checked first so the operator hears about the ceiling that
 * actually takes the bot offline for weeks, not the tripwire that clears at
 * UTC midnight.
 */
function refusalReason(
  settledDaily: number,
  settledMonthly: number,
  outstanding: number,
): "monthly" | "daily" | null {
  if (settledMonthly + outstanding > MONTHLY_TOKEN_CAP) return "monthly";
  if (settledDaily + outstanding > DAILY_TOKEN_CAP) return "daily";
  return null;
}

async function releaseFromRedis(
  redis: NonNullable<ReturnType<typeof getRedis>>,
  key: string,
  amount: number,
): Promise<void> {
  const left = await redis.decrby(key, amount);
  if (left >= 0) return;

  // DECRBY on a bucket that has already expired RECREATES it at a negative
  // value, and a negative bucket hands every concurrent reserver free budget.
  //
  // Undo exactly the overshoot rather than DELeting the key. DEL would also
  // destroy every claim that landed in this bucket between the DECRBY and the
  // DEL — wiping a whole minute of live reservations to correct our own
  // arithmetic. INCRBY is atomic, so adding `-left` back can only ever cancel
  // the part that went below zero and leaves any concurrent claim standing.
  await redis.incrby(key, -left);
  // The key came back from the dead without a TTL. Give it one so a spent
  // bucket cannot outlive its window.
  await redis.expire(key, RESERVE_TTL_SECONDS);
}

/**
 * Settle an admitted reservation: credit the provider's real usage, then hand
 * the allowance back. Idempotent — the second and later calls are no-ops, so
 * the route can settle from whichever exit path happens first.
 *
 * Never throws. Pass 0/undefined usage when the request produced nothing.
 */
export async function settleReservation(
  reservation: BudgetReservation,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): Promise<void> {
  if (reservation.settled) return;
  reservation.settled = true;

  // Credit the real spend BEFORE releasing the allowance. The other order
  // lets a concurrent reserver observe a moment where neither the allowance
  // nor the usage is counted, and admit on a total that is briefly too low.
  await recordTokenUsage(inputTokens, outputTokens);

  // Release from the ledger that actually holds the claim, and only that one.
  // Releasing from both looks harmless and is not: a memory-held reservation
  // DECRBYing Redis cancels somebody else's live claim (see redisHeld).
  if (!reservation.redisHeld) {
    memRelease(reservation.key, reservation.allowance);
    return;
  }

  const redis = getRedis();
  // Redis held the claim but is no longer configured. Nothing to release
  // against; the bucket's TTL reclaims it.
  if (!redis) return;
  try {
    await releaseFromRedis(redis, reservation.key, reservation.allowance);
    noteRedisOk();
  } catch (err) {
    // The bucket's TTL reclaims the allowance either way.
    noteRedisFailure("reservation release", err);
  }
}

// ── Read-only views ───────────────────────────────────────────────

/**
 * Effective usage for a period: what has actually been spent plus what is
 * currently reserved. Returns null when Redis has been down long enough that
 * we genuinely do not know.
 */
async function effectiveTotal(period: "daily" | "monthly"): Promise<number | null> {
  const settledKey = period === "daily" ? todayKey() : monthKey();
  const redis = getRedis();
  if (redis) {
    try {
      const values = await redis.mget<Array<number | null>>([
        settledKey,
        ...activeReserveKeys(),
      ]);
      noteRedisOk();
      return values.reduce<number>((sum, v) => sum + toCount(v), 0);
    } catch (err) {
      noteRedisFailure(`${period} cap read`, err);
      if (budgetUnknown()) return null;
      // Fall through to the in-memory ledger rather than returning 0.
    }
  }
  return getMemBucket(period).total + memOutstandingTotal();
}

/**
 * True if today's effective total (spent + reserved) has met or exceeded the
 * daily cap. Never throws. On a Redis error it degrades to this isolate's
 * in-memory ledger; after REDIS_FAILURE_TRIP consecutive failures it returns
 * true (budget unknown ⇒ treated as spent).
 *
 * The request path admits through reserveTokens, not through this — a read is
 * a snapshot and cannot bound anything under concurrency. This is the
 * observation view: alerting, and the tests that pin the fail-safe behaviour.
 */
export async function isOverDailyCap(): Promise<boolean> {
  const total = await effectiveTotal("daily");
  return total === null || total >= DAILY_TOKEN_CAP;
}

/**
 * True if this calendar month's effective total has met or exceeded the
 * monthly cap — the real budget ceiling. Same fail-safe degradation and the
 * same "observation, not admission" caveat as isOverDailyCap.
 */
export async function isOverMonthlyCap(): Promise<boolean> {
  const total = await effectiveTotal("monthly");
  return total === null || total >= MONTHLY_TOKEN_CAP;
}

/**
 * Records token usage against both the daily and monthly counters. Also fires
 * a Sentry warn event once per month when the monthly counter first crosses
 * the warn fraction (dedupe via SET NX on a sibling key, so repeated
 * crossings only alert once per calendar month).
 *
 * settleReservation calls this for reserved spend. Call it DIRECTLY only for
 * paid work that had no reservation of its own — the topic-classification
 * call is the one such case, and it is small, unavoidable and best-effort.
 * Unreserved spend is counted but not admission-controlled: it can push a
 * counter past its cap, which stops the NEXT request rather than this one.
 *
 * Fire-and-forget: never throws. The in-memory buckets are incremented
 * unconditionally first, so a Redis failure loses the shared count but
 * never loses the spend entirely.
 */
export async function recordTokenUsage(
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): Promise<void> {
  const total = (inputTokens ?? 0) + (outputTokens ?? 0);
  if (total <= 0) return;

  // Always count locally, even when Redis is healthy. It costs two additions
  // and it means the in-memory bucket is already warm the moment Upstash
  // blips — without this, the fail-safe read path above would degrade to a
  // bucket that reads 0 and would happily wave every request through.
  getMemBucket("daily").total += total;
  getMemBucket("monthly").total += total;

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
      noteRedisOk();
    } catch (err) {
      // The in-memory buckets were already incremented above, so the spend is
      // still accounted for somewhere and the read path can act on it.
      noteRedisFailure("token incrby", err);
    }
  }
}

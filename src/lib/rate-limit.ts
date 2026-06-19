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

// 3 req/min per IP for the public self-serve join — stricter than the generic
// form limit because it's an unauthenticated write: each accepted POST inserts 4
// rows (org + contact + membership + invoice) and opens a Stripe Checkout session
// before any payment. Cross-isolate effectiveness depends on Upstash Redis being
// configured in prod (see docs/upstash-redis-prod-setup.md); the in-memory
// fallback is per-isolate, so an attacker fanning across cold isolates can beat it.
export const joinLimiter = makeLimiter(3, "rl:join");

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
  // Prefer x-real-ip: Vercel's edge sets it to the real client IP and overwrites
  // any client-supplied value, so it can't be spoofed the way the leftmost
  // x-forwarded-for hop can (a client can prepend a fake XFF; the proxy only
  // appends). Fall back to the first XFF hop for local/dev where x-real-ip is
  // absent, then to a stable constant so keying never breaks.
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}

/** Returns a 429 Response if rate limited, null if OK to proceed. */
export async function applyRateLimit(
  req: Request,
  limiter: SimpleLimiter,
): Promise<Response | null> {
  const { success } = await limiter.limit(getRequestIp(req));
  if (!success) {
    return new Response("Too many requests, please slow down.", {
      status: 429,
    });
  }
  return null;
}

// ── Lazy fail-open limiter (portal routes) ─────────────────────────
//
// The limiters above (chatLimiter, formLimiter, …) are constructed at module
// load, which calls getRedis() at import time. For routes that must keep the
// production build secret-free AND must never 500 on a limiter hiccup, we want
// stricter guarantees:
//
//   • LAZY — the limiter (Upstash or in-memory) is built on first .limit()
//     call, not at import. Importing this module reads no env and opens no
//     socket, so `next build`'s page-data collection stays secret-free.
//   • FAIL OPEN — if the Upstash client can't init (env absent) or a check
//     throws, the request is ALLOWED and we warn once. A rate limiter is a
//     guardrail, not a gate: a transient Redis error must not take down
//     magic-link login or checkout.
//
// This differs from applyRateLimit + the eager limiters, which fall back to a
// per-isolate in-memory limiter (fail-closed-ish). Here a missing limiter means
// "allow", because for these endpoints availability beats perfect limiting.
function makeLazyFailOpenLimiter(requestsPerMinute: number, prefix: string) {
  let limiter: SimpleLimiter | undefined;
  let warned = false;

  function warnOnce(reason: string, err?: unknown) {
    if (warned) return;
    warned = true;
    console.warn(`[rate-limit] ${prefix} failing open: ${reason}`, err ?? "");
  }

  return {
    /** True if the request is allowed, false if it should be 429'd. */
    async allow(key: string): Promise<boolean> {
      try {
        if (limiter === undefined) {
          // Build on first use. Upstash when configured; in-memory otherwise.
          limiter =
            makeUpstashLimiter(requestsPerMinute, prefix) ??
            new InMemoryLimiter(requestsPerMinute);
        }
        const { success } = await limiter.limit(key);
        return success;
      } catch (err) {
        // Limiter threw (e.g. Redis unreachable) — fail open.
        warnOnce("limiter check threw", err);
        return true;
      }
    },
  };
}

// 5 req/min per IP for magic-link requests — humans don't request links 5x/min.
const portalAuthLimiter = makeLazyFailOpenLimiter(5, "rl:portal-auth");

// 10 req/min per IP for checkout-session creation.
const portalCheckoutLimiter = makeLazyFailOpenLimiter(10, "rl:portal-checkout");

// 20 req/min per IP for profile saves — an authenticated member editing their
// own listing; generous, just caps runaway clients / scripted abuse.
const portalProfileLimiter = makeLazyFailOpenLimiter(20, "rl:portal-profile");

// 10 req/min per IP for event registration — public endpoint that writes rows +
// creates Stripe sessions; generous for real attendees, caps scripted abuse.
const eventRegisterLimiter = makeLazyFailOpenLimiter(10, "rl:event-register");

/**
 * Fail-open rate-limit guard for the magic-link request endpoint.
 * Returns a 429 Response when over the limit, otherwise null (proceed).
 * Never throws; on any limiter failure the request is allowed.
 */
export async function limitPortalAuth(req: Request): Promise<Response | null> {
  const ok = await portalAuthLimiter.allow(getRequestIp(req));
  return ok ? null : new Response("Too many requests.", { status: 429 });
}

/**
 * Fail-open rate-limit guard for the checkout endpoint.
 * Returns a 429 Response when over the limit, otherwise null (proceed).
 * Never throws; on any limiter failure the request is allowed.
 */
export async function limitPortalCheckout(
  req: Request,
): Promise<Response | null> {
  const ok = await portalCheckoutLimiter.allow(getRequestIp(req));
  return ok ? null : new Response("Too many requests.", { status: 429 });
}

/**
 * Fail-open rate-limit guard for the profile-update endpoint.
 * Returns a 429 Response when over the limit, otherwise null (proceed).
 * Never throws; on any limiter failure the request is allowed.
 */
export async function limitPortalProfile(
  req: Request,
): Promise<Response | null> {
  const ok = await portalProfileLimiter.allow(getRequestIp(req));
  return ok ? null : new Response("Too many requests.", { status: 429 });
}

/**
 * Fail-open rate-limit guard for the public event-registration endpoint.
 * Returns a 429 Response when over the limit, otherwise null (proceed).
 * Never throws; on any limiter failure the request is allowed.
 */
export async function limitEventRegister(
  req: Request,
): Promise<Response | null> {
  const ok = await eventRegisterLimiter.allow(getRequestIp(req));
  return ok ? null : new Response("Too many requests.", { status: 429 });
}

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
 * History: the site once degraded silently to "no rate limiting" when the
 * Upstash env vars were missing (caught by the website-security-sentinel
 * audit); the in-memory fallback above closed that gap. As of 2026-06-19,
 * UPSTASH_REDIS_REST_URL + _TOKEN ARE set in all three Vercel environments —
 * Production, Preview, and Development (verified via `vercel env ls`) — so every
 * deployed environment uses the distributed limiter. The in-memory fallback now
 * only applies to a local process started without those vars loaded.
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

// Same as makeUpstashLimiter but with an arbitrary window, for limiters that
// enforce more than a per-minute cap (e.g. the admin-login hourly ceiling).
function makeUpstashWindowLimiter(
  limit: number,
  window: `${number} h` | `${number} m`,
  prefix: string,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
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
  // windowMs defaults to 60s so every existing caller (perMinute) is unchanged.
  constructor(
    private readonly limit_: number,
    private readonly windowMs: number = 60_000,
  ) {}

  async limit(key: string): Promise<{ success: boolean }> {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.windowMs };
      // LRU-ish: evict oldest when oversized.
      if (this.buckets.size >= MAX_BUCKETS) {
        const firstKey = this.buckets.keys().next().value;
        if (firstKey !== undefined) this.buckets.delete(firstKey);
      }
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    return { success: bucket.count <= this.limit_ };
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

// 60 req/min per IP for analytics beacons (directory-view etc.). These fire
// once per listing page mount, so a visitor browsing the directory legitimately
// sends several per minute. They MUST NOT share the form budget: when the
// directory-view beacon used formLimiter, opening 5 member listings exhausted
// rl:form and the visitor's subsequent contact-form submission was 429'd.
export const trackLimiter = makeLimiter(60, "rl:track");

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

// 60 req/min per IP for the public unsubscribe endpoint. The HMAC token is
// unforgeable, but each GET click still runs a DB UPDATE attempt — a human
// clicks once, so 60/min is generous while capping an unauthenticated flood.
export const emailUnsubscribeLimiter = makeLimiter(60, "rl:email-unsub");

// 600 req/min per IP for the Resend webhook — sized comfortably above Resend's
// legitimate delivery-event burst, applied before signature verification so an
// unauthenticated flood is rejected before the HMAC check and raw-body read.
export const resendWebhookLimiter = makeLimiter(600, "rl:resend-webhook");

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
//   • DEGRADE, DON'T FAIL OPEN — when Upstash isn't configured the limiter is
//     in-memory per-isolate; when a configured Upstash check throws (Redis blip)
//     it ALSO degrades to that in-memory limiter rather than allowing
//     unconditionally, and warns once. A guardrail still applies during an
//     outage, and the endpoint never 500s on the limiter.
//
// Like applyRateLimit + the eager limiters, the worst case is a per-isolate
// in-memory limiter (fail-closed-ish) — never "no limiter at all" — which matters
// because these endpoints send mail and open Stripe sessions.
function makeLazyFailOpenLimiter(requestsPerMinute: number, prefix: string) {
  let limiter: SimpleLimiter | undefined;
  let memFallback: InMemoryLimiter | undefined;
  let warned = false;

  function warnOnce(reason: string, err?: unknown) {
    if (warned) return;
    warned = true;
    console.warn(`[rate-limit] ${prefix} degrading to in-memory: ${reason}`, err ?? "");
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
        // Upstash threw (Redis unreachable). These endpoints send mail, open
        // Stripe sessions, and write rows, so DON'T fail fully open — degrade to a
        // per-isolate in-memory limiter so a guardrail still applies during the
        // outage (the same fallback the eager limiters use). Only a thrown
        // in-memory check (shouldn't happen) allows, so the guard never 500s.
        warnOnce("Upstash limiter threw", err);
        try {
          memFallback ??= new InMemoryLimiter(requestsPerMinute);
          const { success } = await memFallback.limit(key);
          return success;
        } catch {
          return true;
        }
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
 * Never throws; degrades to a per-isolate in-memory limiter if Upstash is unavailable.
 */
export async function limitPortalAuth(req: Request): Promise<Response | null> {
  const ok = await portalAuthLimiter.allow(getRequestIp(req));
  return ok ? null : new Response("Too many requests.", { status: 429 });
}

/**
 * Fail-open rate-limit guard for the checkout endpoint.
 * Returns a 429 Response when over the limit, otherwise null (proceed).
 * Never throws; degrades to a per-isolate in-memory limiter if Upstash is unavailable.
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
 * Never throws; degrades to a per-isolate in-memory limiter if Upstash is unavailable.
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
 * Never throws; degrades to a per-isolate in-memory limiter if Upstash is unavailable.
 */
export async function limitEventRegister(
  req: Request,
): Promise<Response | null> {
  const ok = await eventRegisterLimiter.allow(getRequestIp(req));
  return ok ? null : new Response("Too many requests.", { status: 429 });
}

// ── Admin login limiter (dual window) ──────────────────────────────
//
// Brute-forcing the admin password must be cheap to block: two lazily-built
// sliding windows per IP — a burst cap (5/min) and a sustained cap (20/hour).
// Applied BEFORE the constant-time credential check so a spammed bad request is
// rejected fast, without ever running the expensive comparison. Lazy + degrade
// (never fail fully open), same discipline as the portal limiters above.
function makeLazyWindowLimiter(
  limit: number,
  window: `${number} h` | `${number} m`,
  windowMs: number,
  prefix: string,
) {
  let limiter: SimpleLimiter | undefined;
  let memFallback: InMemoryLimiter | undefined;
  let warned = false;

  function warnOnce(reason: string, err?: unknown) {
    if (warned) return;
    warned = true;
    console.warn(`[rate-limit] ${prefix} degrading to in-memory: ${reason}`, err ?? "");
  }

  return {
    async allow(key: string): Promise<boolean> {
      try {
        if (limiter === undefined) {
          limiter =
            makeUpstashWindowLimiter(limit, window, prefix) ??
            new InMemoryLimiter(limit, windowMs);
        }
        const { success } = await limiter.limit(key);
        return success;
      } catch (err) {
        warnOnce("Upstash limiter threw", err);
        try {
          memFallback ??= new InMemoryLimiter(limit, windowMs);
          const { success } = await memFallback.limit(key);
          return success;
        } catch {
          return true;
        }
      }
    },
  };
}

const adminAuthPerMinute = makeLazyWindowLimiter(5, "1 m", 60_000, "rl:admin-auth-min");
const adminAuthPerHour = makeLazyWindowLimiter(20, "1 h", 60 * 60_000, "rl:admin-auth-hr");

// ── Contact form limiter (dual window, own prefix) ─────────────────
//
// The public contact form sends mail, so it gets the same discipline as admin
// auth: a burst cap (5/min) AND a sustained cap (20/hour) per IP, so a single
// IP can't flood the chamber inbox or burn the Resend quota across an hour.
// Own prefix (rl:contact-*) so no other form/beacon traffic can starve it, and
// lazy + degrade-never-throw so a Redis blip can't 500 a real submission.
const contactPerMinute = makeLazyWindowLimiter(5, "1 m", 60_000, "rl:contact-min");
const contactPerHour = makeLazyWindowLimiter(20, "1 h", 60 * 60_000, "rl:contact-hr");

/**
 * Rate-limit guard for the public contact form: 5/min AND 20/hour per IP.
 * Returns a JSON 429 Response (so the form client can read `.error` and show
 * a specific message) when either window is exceeded, otherwise null. Never throws.
 */
export async function limitContactForm(req: Request): Promise<Response | null> {
  const key = getRequestIp(req);
  if (!(await contactPerMinute.allow(key)) || !(await contactPerHour.allow(key))) {
    return Response.json(
      { error: "Too many messages from this connection. Please wait a minute and try again, or call us at (330) 723-8773." },
      { status: 429 },
    );
  }
  return null;
}

/**
 * Rate-limit guard for the admin login route: 5 attempts/min AND 20/hour per IP.
 * Returns a 429 Response (with a `reason` tag) when either window is exceeded,
 * otherwise null. Checked before the credential comparison. Never throws.
 */
export async function limitAdminAuth(
  req: Request,
): Promise<{ response: Response; reason: "rate_min" | "rate_hour" } | null> {
  const key = getRequestIp(req);
  // Check both windows; the minute burst cap is the tighter, more common trip.
  if (!(await adminAuthPerMinute.allow(key))) {
    return { response: new Response("Too many requests.", { status: 429 }), reason: "rate_min" };
  }
  if (!(await adminAuthPerHour.allow(key))) {
    return { response: new Response("Too many requests.", { status: 429 }), reason: "rate_hour" };
  }
  return null;
}

/**
 * Opt-in rate limiting via Upstash Redis.
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars to activate.
 * Falls through (no limiting) if env vars are absent — site still works without setup.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function makeRateLimiter(
  requestsPerMinute: number,
  prefix: string
): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requestsPerMinute, "1 m"),
    prefix,
  });
}

// 20 req/min per IP for chat — generous enough for real users, stops bots
export const chatLimiter = makeRateLimiter(20, "rl:chat");

// 5 req/min per IP for forms — humans don't submit forms 5x/min
export const formLimiter = makeRateLimiter(5, "rl:form");

/** Returns a 429 Response if rate limited, null if OK to proceed. */
export async function applyRateLimit(
  req: Request,
  limiter: Ratelimit | null
): Promise<Response | null> {
  if (!limiter) return null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  const { success } = await limiter.limit(ip);
  if (!success) {
    return new Response("Too many requests — please slow down.", { status: 429 });
  }
  return null;
}

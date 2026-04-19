/**
 * GET /api/health
 * ---------------
 * Liveness + dependency check for external monitoring (UptimeRobot,
 * BetterStack, Vercel Cron, etc). Pings every external service the
 * site depends on in parallel with short timeouts and reports each
 * one's status individually.
 *
 * Response shape:
 *   {
 *     ok: boolean,           // true only if every required dep is "ok"
 *     timestamp: string,     // ISO-8601 of when checks ran
 *     deps: {
 *       upstashVector: { status: "ok" | "error" | "skip", ms?, error? },
 *       anthropic:     { status, ms?, error? },
 *       resend:        { status, ms?, error? },
 *     }
 *   }
 *
 * HTTP status:
 *   200 — every required dep reported "ok"
 *   503 — at least one required dep failed (UptimeRobot will alert)
 *
 * Auth: none. The endpoint exposes only boolean health, never secrets,
 * counts, or implementation details. Rate-limited to 60/min/IP via
 * the existing Upstash limiter so it can't be abused for amplification.
 *
 * Runtime: edge (matches /api/search and /api/chat).
 */

import { NextResponse } from "next/server";
import { healthLimiter, applyRateLimit } from "@/lib/rate-limit";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Each check returns a uniform shape. Per-dep timeout keeps the whole
// /health request bounded — no waiting on a hung upstream.
type DepResult = {
  status: "ok" | "error" | "skip";
  ms?: number;
  error?: string;
};

const TIMEOUT_MS = 4000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
    ),
  ]);
}

async function checkUpstashVector(): Promise<DepResult> {
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) return { status: "skip", error: "env missing" };
  const t0 = Date.now();
  try {
    const res = await withTimeout(
      fetch(`${url}/info`, { headers: { Authorization: `Bearer ${token}` } }),
      "upstash"
    );
    if (!res.ok) return { status: "error", ms: Date.now() - t0, error: `HTTP ${res.status}` };
    return { status: "ok", ms: Date.now() - t0 };
  } catch (err) {
    return { status: "error", ms: Date.now() - t0, error: (err as Error).message };
  }
}

async function checkAnthropic(): Promise<DepResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { status: "skip", error: "env missing" };
  const t0 = Date.now();
  try {
    // /v1/models is a low-cost auth check — no message tokens consumed.
    const res = await withTimeout(
      fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      }),
      "anthropic"
    );
    if (!res.ok) return { status: "error", ms: Date.now() - t0, error: `HTTP ${res.status}` };
    return { status: "ok", ms: Date.now() - t0 };
  } catch (err) {
    return { status: "error", ms: Date.now() - t0, error: (err as Error).message };
  }
}

async function checkResend(): Promise<DepResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "skip", error: "env missing" };
  const t0 = Date.now();
  try {
    // /domains is an auth-only check — doesn't send anything or use quota.
    const res = await withTimeout(
      fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      "resend"
    );
    if (!res.ok) return { status: "error", ms: Date.now() - t0, error: `HTTP ${res.status}` };
    return { status: "ok", ms: Date.now() - t0 };
  } catch (err) {
    return { status: "error", ms: Date.now() - t0, error: (err as Error).message };
  }
}

export async function GET(req: Request) {
  const limited = await applyRateLimit(req, healthLimiter);
  if (limited) return limited;

  const [upstashVector, anthropic, resend] = await Promise.all([
    checkUpstashVector(),
    checkAnthropic(),
    checkResend(),
  ]);

  // Required deps for the site to function: Upstash Vector (search) and
  // Anthropic (chat). Resend is desirable but the site stays usable
  // without it — its outage shouldn't trigger a 503.
  const required = [upstashVector, anthropic];
  const ok = required.every((d) => d.status === "ok");

  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      deps: { upstashVector, anthropic, resend },
    },
    { status: ok ? 200 : 503 }
  );
}

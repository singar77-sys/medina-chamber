/**
 * Lightweight Langfuse ingestion helper — edge-safe, zero dependencies.
 *
 * Uses the Langfuse HTTP ingestion API directly so no SDK is needed and
 * there is no OTel pipeline conflict with Sentry. Failures are non-fatal:
 * telemetry errors must never degrade the user-facing stream.
 *
 * Required env vars (set in Vercel dashboard + .env.local):
 *   LANGFUSE_PUBLIC_KEY   — pk-lf-…
 *   LANGFUSE_SECRET_KEY   — sk-lf-…
 *   LANGFUSE_HOST         — optional; defaults to https://cloud.langfuse.com
 */

const LANGFUSE_HOST =
  process.env.LANGFUSE_HOST ?? "https://cloud.langfuse.com";

export interface LangfuseTraceParams {
  id: string;
  name: string;
  sessionId?: string;
  /** Anonymized user identifier — hashed IP or similar. */
  userId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface LangfuseGenerationParams {
  traceId: string;
  name: string;
  model: string;
  modelParameters?: Record<string, unknown>;
  /**
   * Intentionally omitted — conversation content is not sent to Langfuse
   * (a third-party service). Full transcripts are stored internally via
   * logConversation → Upstash Redis (admin-only access). Langfuse receives
   * only structural metadata: token counts, source, session linkage.
   */
  input?: Array<{ role: string; content: string }>;
  /** Omitted for the same reason as input. */
  output?: string;
  usage: { input: number; output: number; total?: number };
  metadata?: Record<string, unknown>;
}

/**
 * Truncate the last 2 octets of an IPv4 address, or the last 4 groups of
 * IPv6, so we get subnet-level user identification without PII exposure.
 */
function anonymizeIp(ip: string): string {
  const v4 = ip.match(/^(\d+\.\d+)\.\d+\.\d+$/);
  if (v4) return `${v4[1]}.0.0`;
  const v6parts = ip.split(":");
  if (v6parts.length >= 4) return v6parts.slice(0, 4).join(":") + "::";
  return ip;
}

/**
 * Fire-and-forget: emit one trace + one generation to Langfuse.
 * Returns a Promise so it can be awaited inside `after()` if needed.
 */
export async function langfuseLog(
  trace: LangfuseTraceParams,
  generation: LangfuseGenerationParams,
): Promise<void> {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) return; // telemetry disabled — no key configured

  const userId = trace.userId ? anonymizeIp(trace.userId) : undefined;
  const now = new Date().toISOString();

  const batch = [
    {
      type: "trace-create",
      id: crypto.randomUUID(),
      timestamp: now,
      body: { ...trace, userId },
    },
    {
      type: "generation-create",
      id: crypto.randomUUID(),
      timestamp: now,
      body: {
        id: crypto.randomUUID(),
        ...generation,
        usage: {
          ...generation.usage,
          total: generation.usage.total ?? generation.usage.input + generation.usage.output,
          unit: "TOKENS",
        },
      },
    },
  ];

  try {
    const res = await fetch(`${LANGFUSE_HOST}/api/public/ingestion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${publicKey}:${secretKey}`)}`,
      },
      body: JSON.stringify({ batch }),
    });
    if (!res.ok) {
      console.error("[langfuse] ingestion failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[langfuse] ingestion error:", err);
  }
}

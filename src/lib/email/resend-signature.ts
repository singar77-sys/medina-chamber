/**
 * Verify a Resend (Svix) webhook signature.
 *
 * Resend signs webhooks with Svix: HMAC-SHA256 over `${id}.${timestamp}.${body}`
 * keyed by the base64 secret (the part after the `whsec_` prefix). The
 * svix-signature header is a space-separated list of `v1,<base64sig>` entries —
 * we accept if any matches (Svix rotates by sending multiple).
 *
 * `nowMs` is injected (not read from Date.now) so this stays a pure, testable
 * function; the route passes Date.now(). Rejects timestamps outside a 5-minute
 * window to blunt replay.
 */

import { createHmac, timingSafeEqual } from "crypto";

export interface SvixHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

const TOLERANCE_SECONDS = 300;

export function verifyResendSignature(
  secret: string,
  body: string,
  headers: SvixHeaders,
  nowMs: number,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(nowMs / 1000) - ts) > TOLERANCE_SECONDS) return false;

  const rawKey = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(rawKey, "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  const provided = signature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter((s): s is string => Boolean(s));

  return provided.some((sig) => {
    let buf: Buffer;
    try {
      buf = Buffer.from(sig, "base64");
    } catch {
      return false;
    }
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  });
}

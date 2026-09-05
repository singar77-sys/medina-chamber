/**
 * POST /api/email/resend-webhook — Resend delivery/engagement events.
 *
 * Verifies the Svix signature over the RAW body (so we must read req.text()
 * before parsing), then applies the event to our tracking tables. Fail-closed:
 * unset secret → 503, bad signature → 401. Always 200 for verified-but-
 * unrecognized events so Resend doesn't retry forever.
 */

import { db } from "@/lib/db";
import { verifyResendSignature } from "@/lib/email/resend-signature";
import { recordResendEvent } from "@/lib/email/track-resend-event";
import { applyRateLimit, resendWebhookLimiter } from "@/lib/rate-limit";
import { readTextBounded, WEBHOOK_MAX_CHARS } from "@/lib/body-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  // IP rate limit first — before the secret check, raw-body read, and signature
  // verification — so an unauthenticated flood is the cheapest possible reject.
  const limited = await applyRateLimit(req, resendWebhookLimiter);
  if (limited) return limited;

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return new Response("not configured", { status: 503 });
  }

  // Bound the raw read BEFORE signature verification — the Svix signature is
  // computed over these exact bytes, so they must be buffered either way; the
  // ceiling caps how much is ever handed to the HMAC and the parse below on an
  // unauthenticated request. It does NOT cap what a hostile caller can make the
  // isolate buffer: only a declared Content-Length is rejected pre-read, and a
  // chunked body is read in full first. Vercel's ~4.5 MB request limit is the
  // real backstop there. See src/lib/body-limit.ts.
  const bounded = await readTextBounded(req, WEBHOOK_MAX_CHARS);
  if ("response" in bounded) return bounded.response;
  const body = bounded.text;

  const valid = verifyResendSignature(
    secret,
    body,
    {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    },
    Date.now(),
  );
  if (!valid) return new Response("invalid signature", { status: 401 });

  let event: { type?: string; data?: { email_id?: string; bounce?: { type?: string } } };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const messageId = event.data?.email_id;
  if (!event.type || !messageId) return new Response("ignored", { status: 200 });

  try {
    await recordResendEvent(db, event.type, messageId, event.data?.bounce?.type ?? null);
  } catch (err) {
    console.error("[resend-webhook] failed to record event:", err);
    return new Response("error", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}

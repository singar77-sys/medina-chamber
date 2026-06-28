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

  const body = await req.text();
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

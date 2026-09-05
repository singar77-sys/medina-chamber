/**
 * POST /api/stripe/webhook
 * ------------------------
 * Receives Stripe webhook events and writes them into the payments ledger.
 *
 * Runtime: nodejs (NOT edge). postgres-js opens a TCP socket, which the edge
 * runtime can't do, and Stripe signature verification needs the raw request
 * bytes. force-dynamic keeps the handler from ever being cached/prerendered.
 *
 * Raw body: in the Next.js App Router, route handlers receive the Web `Request`,
 * and `await req.text()` returns the body exactly as sent — no body parser sits
 * in front of it. That raw string is what `constructEvent` must verify against;
 * a JSON-reparsed body would fail the signature check.
 *
 * Idempotency: Stripe retries deliveries until it gets a 2xx. The ledger's
 * UNIQUE constraints on stripeChargeId / stripeRefundId make recordPayment safe
 * to call repeatedly, so a redelivered event is a no-op rather than a double
 * charge. We therefore return 200 on every handled or ignored event, 400 only on
 * a bad signature, 503 when STRIPE_WEBHOOK_SECRET isn't configured, and 500 only
 * on an unexpected throw.
 */

import type Stripe from "stripe";
import { and, eq, inArray, sql } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";
import {
  invoices,
  payments,
  events,
  eventTickets,
  eventRegistrations,
} from "@/lib/db/schema";
import { recordPayment } from "@/lib/billing/ledger";
import { notifyRegistration } from "@/lib/events/notify-registration";
import { processJoinPayment } from "@/lib/membership/process-join-payment";
import { processRenewalPayment } from "@/lib/membership/process-renewal-payment";
import { readTextBounded, WEBHOOK_MAX_CHARS } from "@/lib/body-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirm a paid event registration. Idempotent: only a `pending` row
 * transitions to `confirmed` and bumps the event/ticket counts, so a Stripe
 * redelivery (or a double webhook) is a safe no-op. The registration row is
 * locked FOR UPDATE so two concurrent deliveries for the same registration
 * can't both pass the pending check.
 *
 * Money integrity: the registration's recorded amountCents — NOT the metadata
 * flag — is the gate. We refuse to confirm a seat that wasn't paid for in full,
 * so any future flow that reuses registrationId metadata with a smaller charge
 * can't buy a registration on the cheap.
 */
async function confirmEventRegistration(
  registrationId: string,
  paymentIntentId: string,
  amountReceived: number,
): Promise<void> {
  const confirmed = await db.transaction(async (tx) => {
    const [reg] = await tx
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        ticketId: eventRegistrations.ticketId,
        quantity: eventRegistrations.quantity,
        amountCents: eventRegistrations.amountCents,
        status: eventRegistrations.status,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.id, registrationId))
      .limit(1)
      .for("update");

    if (!reg) {
      console.warn(
        `[stripe webhook] event registration ${registrationId} not found — skipping`,
      );
      return false;
    }
    // Only pending → confirmed bumps counts; anything else is an idempotent no-op.
    if (reg.status !== "pending") return false;

    // Never confirm a seat that wasn't actually paid for in full.
    if (amountReceived < reg.amountCents) {
      console.warn(
        `[stripe webhook] registration ${registrationId} paid ${amountReceived} < expected ${reg.amountCents} — leaving pending`,
      );
      return false;
    }

    await tx
      .update(eventRegistrations)
      .set({
        status: "confirmed",
        stripePaymentIntentId: paymentIntentId,
        updatedAt: sql`now()`,
      })
      .where(eq(eventRegistrations.id, reg.id));

    await tx
      .update(events)
      .set({
        registrationCount: sql`${events.registrationCount} + ${reg.quantity}`,
        updatedAt: sql`now()`,
      })
      .where(eq(events.id, reg.eventId));

    if (reg.ticketId) {
      await tx
        .update(eventTickets)
        .set({ soldCount: sql`${eventTickets.soldCount} + ${reg.quantity}` })
        .where(eq(eventTickets.id, reg.ticketId));
    }

    return true;
  });

  // Send the confirmation email only when THIS delivery actually confirmed —
  // a redelivery that no-ops (already confirmed) must not re-send.
  if (confirmed) await notifyRegistration(registrationId);
}

export async function POST(req: Request) {
  // Fail-closed on a misconfigured deploy: without the signing secret we can't
  // verify anything, so return an explicit 503 (mirrors the Resend webhook)
  // instead of letting constructEvent throw a misleading "bad signature" 400 that
  // would silently drop every payment + membership activation.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("not configured", { status: 503 });
  }

  // Bound the raw read BEFORE signature verification: the body has to be
  // buffered to verify it, so this caps what constructEvent is ever asked to
  // HMAC and re-parse on an unauthenticated request. Defense in depth, not a hot
  // fix — the 503 above already short-circuits an unconfigured deploy, and a
  // verified Stripe event is never anywhere near this size.
  //
  // What it is NOT: a bound on what a hostile caller can make the isolate
  // buffer. readTextBounded rejects pre-read only on a declared Content-Length;
  // a chunked body is read in full and measured after. Vercel's ~4.5 MB request
  // limit is the actual backstop there. See src/lib/body-limit.ts.
  const bounded = await readTextBounded(req, WEBHOOK_MAX_CHARS);
  if ("response" in bounded) return bounded.response;
  const rawBody = bounded.text;
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig ?? "",
      webhookSecret,
    );
  } catch {
    return new Response("bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;

        // Event-registration payment → confirm the registration. This is a
        // separate flow from dues (no invoice ledger entry); the registration
        // row itself is the record of the sale.
        const registrationId = pi.metadata?.registrationId;
        if (registrationId) {
          await confirmEventRegistration(
            registrationId,
            pi.id,
            pi.amount_received ?? pi.amount ?? 0,
          );
          break;
        }

        // Join payment → record the charge + activate the new membership.
        if (pi.metadata?.type === "join") {
          const orgId = pi.metadata.organizationId;
          const invId = pi.metadata.invoiceId;
          const memId = pi.metadata.membershipId;
          if (orgId && invId && memId) {
            await processJoinPayment(db, {
              organizationId: orgId,
              invoiceId: invId,
              membershipId: memId,
              amountReceived: pi.amount_received ?? pi.amount ?? 0,
              stripeChargeId:
                typeof pi.latest_charge === "string"
                  ? pi.latest_charge
                  : (pi.latest_charge?.id ?? undefined),
              stripePaymentMethodId:
                typeof pi.payment_method === "string"
                  ? pi.payment_method
                  : (pi.payment_method?.id ?? undefined),
            });
          } else {
            console.warn(
              `[stripe webhook] join payment ${pi.id} missing org/invoice/membership ids — skipping`,
            );
          }
          break;
        }

        const organizationId = pi.metadata?.organizationId;
        const invoiceId = pi.metadata?.invoiceId;

        // Without both ids we can't attribute the charge to an invoice. This is
        // expected for PaymentIntents created outside our billing flow, so it's
        // an ack (200), not an error.
        if (!organizationId || !invoiceId) {
          console.warn(
            `[stripe webhook] payment_intent.succeeded ${pi.id} has no organizationId/invoiceId metadata — skipping`,
          );
          break;
        }

        const duesResult = await recordPayment(db, {
          organizationId,
          invoiceId,
          type: "charge",
          method: "card",
          amountCents: pi.amount_received ?? pi.amount,
          stripeChargeId:
            typeof pi.latest_charge === "string"
              ? pi.latest_charge
              : (pi.latest_charge?.id ?? undefined),
          stripePaymentMethodId:
            typeof pi.payment_method === "string"
              ? pi.payment_method
              : (pi.payment_method?.id ?? undefined),
        });

        // If that payment fully settled a renewal invoice, advance the
        // membership's renewal date + reactivate it. No-ops for non-renewal
        // invoices, so it's safe to call on every fully-paid dues invoice.
        if (duesResult.invoiceStatus === "paid") {
          await processRenewalPayment(db, invoiceId);
        } else {
          // The portal sets the Checkout amount to the exact open balance, so a
          // dues charge that doesn't fully settle the invoice is an anomaly worth
          // surfacing — a short payment otherwise leaves the invoice silently pending.
          console.warn(
            `[stripe webhook] dues charge ${pi.id} on invoice ${invoiceId} did not fully settle it ` +
              `(status=${duesResult.invoiceStatus}, paidCents=${duesResult.amountPaidCents}) — possible short payment`,
          );
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        // Attribution: PaymentIntent / Checkout metadata does NOT propagate to
        // the Charge, so charge.metadata is empty here. The original charge was
        // recorded in the ledger with stripeChargeId = charge.id — look that row
        // up to recover the invoice + org it paid.
        const [orig] = await db
          .select({ invoiceId: payments.invoiceId, organizationId: payments.organizationId })
          .from(payments)
          .where(eq(payments.stripeChargeId, charge.id))
          .limit(1);

        if (!orig?.invoiceId) {
          console.warn(
            `[stripe webhook] charge.refunded ${charge.id}: no recorded charge to attribute — skipping`,
          );
          break;
        }

        // Stripe returns refunds most-recent-first; data[0] is the refund THIS
        // event represents. Record ITS delta — NOT charge.amount_refunded, which
        // is the cumulative total across all refunds — keyed on the refund id so
        // a redelivery is idempotent and partial refunds each record once.
        const latestRefund = charge.refunds?.data?.[0];
        if (!latestRefund) {
          console.warn(
            `[stripe webhook] charge.refunded ${charge.id}: no refund detail on the event — skipping`,
          );
          break;
        }

        await recordPayment(db, {
          organizationId: orig.organizationId,
          invoiceId: orig.invoiceId,
          type: "refund",
          method: "card",
          amountCents: -latestRefund.amount,
          stripeRefundId: latestRefund.id,
        });
        break;
      }

      case "invoice.payment_failed": {
        const stripeInvoice = event.data.object as Stripe.Invoice;
        const invoiceId = stripeInvoice.metadata?.invoiceId;

        if (invoiceId) {
          // Only a still-open invoice may flip to past_due. A late or duplicated
          // payment_failed must never revert an invoice that a concurrent
          // payment_intent.succeeded already settled (or that was voided).
          await db
            .update(invoices)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(and(eq(invoices.id, invoiceId), inArray(invoices.status, ["pending", "draft"])));
        } else {
          console.warn(
            `[stripe webhook] invoice.payment_failed ${stripeInvoice.id} has no invoiceId metadata — skipping`,
          );
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge so Stripe stops retrying.
        break;
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error(`[stripe webhook] error handling ${event.type}:`, err);
    return new Response("internal error", { status: 500 });
  }
}

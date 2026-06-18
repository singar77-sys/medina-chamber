/**
 * POST /api/portal/checkout
 * -------------------------
 * Creates a Stripe Checkout Session so a logged-in member can pay the open
 * balance on one of their organization's invoices.
 *
 * Runtime: nodejs (NOT edge). ensureStripeCustomer / db touch postgres-js, which
 * opens a TCP socket the edge runtime can't. force-dynamic keeps this handler
 * from ever being cached/prerendered — it reads the session cookie and writes to
 * Stripe on every call.
 *
 * Auth: same mechanism as /portal/dashboard — the portal_session cookie is
 * HMAC-verified by verifyPortalSession, which yields the member's contactId and
 * organizationId. We never trust an organizationId from the request body.
 *
 * Attribution: payment_intent_data.metadata carries { invoiceId, organizationId }
 * onto the PaymentIntent. The Phase 2 webhook (src/app/api/stripe/webhook) reads
 * exactly those keys off pi.metadata on payment_intent.succeeded to record the
 * payment against the invoice. Session-level metadata mirrors them for the
 * checkout.session.* events. Drop the payment_intent_data block and a successful
 * card payment would never be attributed to the invoice.
 */

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe/client";
import { ensureStripeCustomer } from "@/lib/stripe/customer";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export async function POST(req: Request): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const invoiceId =
    body && typeof body === "object" && "invoiceId" in body
      ? (body as { invoiceId?: unknown }).invoiceId
      : undefined;

  if (typeof invoiceId !== "string" || invoiceId.length === 0) {
    return Response.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const [invoice] = await db
    .select({
      id: invoices.id,
      organizationId: invoices.organizationId,
      description: invoices.description,
      amountCents: invoices.amountCents,
      amountPaidCents: invoices.amountPaidCents,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    return Response.json({ error: "invoice not found" }, { status: 404 });
  }

  // Authorization: a member may only pay invoices belonging to their own org.
  // The org comes from the signed session, never from the request.
  if (invoice.organizationId !== session.organizationId) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const balanceCents = invoice.amountCents - invoice.amountPaidCents;
  if (balanceCents <= 0) {
    return Response.json(
      { error: "invoice has no open balance" },
      { status: 400 },
    );
  }

  const customerId = await ensureStripeCustomer(db, invoice.organizationId);

  // Prefer the configured public site URL so success/cancel land on the right
  // host behind proxies; fall back to the request origin in dev / preview.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const metadata = {
    invoiceId: invoice.id,
    organizationId: invoice.organizationId,
  };

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: balanceCents,
          product_data: {
            name: invoice.description || "Chamber membership dues",
          },
        },
        quantity: 1,
      },
    ],
    // CRITICAL: the webhook reads invoiceId + organizationId off the
    // PaymentIntent's metadata on payment_intent.succeeded.
    payment_intent_data: { metadata },
    metadata,
    success_url: `${origin}/portal/billing?paid=1`,
    cancel_url: `${origin}/portal/billing?canceled=1`,
  });

  return Response.json({ url: checkoutSession.url });
}

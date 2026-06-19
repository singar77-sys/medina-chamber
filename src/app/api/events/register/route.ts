/**
 * POST /api/events/register
 * --------------------------
 * Registers a member (via the portal_session cookie) or a guest (name + email)
 * for an event. Free tickets confirm immediately; paid tickets create a pending
 * registration + a Stripe Checkout Session and confirm on the webhook. When the
 * event is at capacity the registration is waitlisted instead.
 *
 * Runtime: nodejs (postgres-js + Stripe need a socket the edge runtime lacks).
 * force-dynamic: reads the session cookie + writes on every call.
 *
 * Security:
 *   • Member identity (contactId/organizationId) comes ONLY from the signed
 *     portal_session cookie, never the body — a guest can't impersonate a member.
 *   • Member-only events/tickets reject guests (403).
 *   • The ticket must belong to the event in the URL (no cross-event price abuse).
 *   • Money: the charged amount is derived server-side from the ticket's
 *     priceCents × quantity, never from the request.
 *
 * Capacity is checked against events.registrationCount at request time (a small
 * oversell race is possible under heavy concurrency; acceptable at chamber scale
 * and reconcilable from the roster). Paid registrations only increment the count
 * on webhook confirmation; free/waitlist increment here, atomically.
 */

import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventTickets, eventRegistrations } from "@/lib/db/schema";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { limitEventRegister } from "@/lib/rate-limit";
import { EMAIL_RE } from "@/lib/email";
import { stripe } from "@/lib/stripe/client";
import { ensureStripeCustomer } from "@/lib/stripe/customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QTY = 20;
const MAX_STR = 200;

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

function bad(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

function str(body: Record<string, unknown>, key: string): string | undefined {
  const v = body[key];
  return typeof v === "string" ? v.trim() : undefined;
}

export async function POST(req: Request): Promise<Response> {
  // Public endpoint — rate limit per IP (~10/min), fail-open.
  const limited = await limitEventRegister(req);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("invalid body");
  }
  if (!body || typeof body !== "object") return bad("invalid body");
  const b = body as Record<string, unknown>;

  const eventId = str(b, "eventId");
  if (!eventId) return bad("eventId is required");

  const ticketId = str(b, "ticketId");

  let quantity = 1;
  if ("quantity" in b) {
    const q = b.quantity;
    if (typeof q !== "number" || !Number.isInteger(q) || q < 1 || q > MAX_QTY) {
      return bad(`quantity must be a whole number from 1 to ${MAX_QTY}`);
    }
    quantity = q;
  }

  // ── Load the event ─────────────────────────────────────────────────────────
  const [event] = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      status: events.status,
      isMembersOnly: events.isMembersOnly,
      startsAt: events.startsAt,
      maxCapacity: events.maxCapacity,
      registrationCount: events.registrationCount,
      registrationOpenAt: events.registrationOpenAt,
      registrationCloseAt: events.registrationCloseAt,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return Response.json({ error: "event not found" }, { status: 404 });

  const now = new Date();
  if (event.status !== "published") return bad("registration is not open for this event");
  if (event.registrationOpenAt && now < event.registrationOpenAt) {
    return bad("registration has not opened yet");
  }
  if (event.registrationCloseAt && now > event.registrationCloseAt) {
    return bad("registration has closed");
  }
  if (event.startsAt && now > event.startsAt) {
    return bad("this event has already started");
  }

  // ── Load the ticket (optional — absent ticket = free RSVP) ──────────────────
  let ticket:
    | {
        id: string;
        name: string;
        priceCents: number;
        stripePriceId: string | null;
        maxQuantity: number | null;
        soldCount: number;
        isMemberOnly: boolean;
      }
    | null = null;

  if (ticketId) {
    const [t] = await db
      .select({
        id: eventTickets.id,
        name: eventTickets.name,
        priceCents: eventTickets.priceCents,
        stripePriceId: eventTickets.stripePriceId,
        maxQuantity: eventTickets.maxQuantity,
        soldCount: eventTickets.soldCount,
        isMemberOnly: eventTickets.isMemberOnly,
      })
      .from(eventTickets)
      .where(and(eq(eventTickets.id, ticketId), eq(eventTickets.eventId, event.id)))
      .limit(1);

    if (!t) return bad("ticket not found for this event");
    ticket = t;

    if (ticket.maxQuantity != null && ticket.soldCount + quantity > ticket.maxQuantity) {
      return bad("not enough tickets remaining");
    }
  }

  const priceCents = ticket?.priceCents ?? 0;
  const amountCents = priceCents * quantity;
  const memberOnly = event.isMembersOnly || (ticket?.isMemberOnly ?? false);

  // ── Resolve identity: member (session) or guest (name + email) ──────────────
  const session = await getSession();
  let contactId: string | null = null;
  let organizationId: string | null = null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;

  if (session) {
    contactId = session.contactId;
    organizationId = session.organizationId;
  } else {
    if (memberOnly) {
      return Response.json(
        { error: "This event is for chamber members. Please sign in to register." },
        { status: 403 },
      );
    }
    guestName = str(b, "guestName") || null;
    guestEmail = (str(b, "guestEmail") || "").toLowerCase() || null;
    if (!guestName || guestName.length > MAX_STR) return bad("Your name is required.");
    if (!guestEmail || guestEmail.length > MAX_STR || !EMAIL_RE.test(guestEmail)) {
      return bad("A valid email is required.");
    }
  }

  const baseRow = {
    eventId: event.id,
    ticketId: ticket?.id ?? null,
    contactId,
    organizationId,
    guestName,
    guestEmail,
    quantity,
    amountCents,
  };

  const atCapacity =
    event.maxCapacity != null && event.registrationCount + quantity > event.maxCapacity;

  // ── Waitlist: no charge, just record + bump the waitlist counter ────────────
  if (atCapacity) {
    const [reg] = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(eventRegistrations)
        .values({ ...baseRow, status: "waitlisted" })
        .returning({ id: eventRegistrations.id });
      await tx
        .update(events)
        .set({ waitlistCount: sql`${events.waitlistCount} + ${quantity}`, updatedAt: sql`now()` })
        .where(eq(events.id, event.id));
      return inserted;
    });
    return Response.json({ status: "waitlisted", registrationId: reg.id });
  }

  // ── Free: confirm immediately + increment counts atomically ─────────────────
  if (amountCents === 0) {
    const [reg] = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(eventRegistrations)
        .values({ ...baseRow, status: "confirmed" })
        .returning({ id: eventRegistrations.id });
      await tx
        .update(events)
        .set({
          registrationCount: sql`${events.registrationCount} + ${quantity}`,
          updatedAt: sql`now()`,
        })
        .where(eq(events.id, event.id));
      if (ticket) {
        await tx
          .update(eventTickets)
          .set({ soldCount: sql`${eventTickets.soldCount} + ${quantity}` })
          .where(eq(eventTickets.id, ticket.id));
      }
      return inserted;
    });
    return Response.json({ status: "confirmed", registrationId: reg.id });
  }

  // ── Paid: pending registration + Stripe Checkout; webhook confirms ──────────
  const [reg] = await db
    .insert(eventRegistrations)
    .values({ ...baseRow, status: "pending" })
    .returning({ id: eventRegistrations.id });

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  // The webhook reads these off the PaymentIntent metadata to confirm the row.
  const metadata = { registrationId: reg.id, eventId: event.id };

  const lineItem = ticket?.stripePriceId
    ? { price: ticket.stripePriceId, quantity }
    : {
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: `${event.title}${ticket ? ` — ${ticket.name}` : ""}`,
          },
        },
        quantity,
      };

  const customerArgs = organizationId
    ? { customer: await ensureStripeCustomer(db, organizationId) }
    : { customer_email: guestEmail ?? undefined };

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      ...customerArgs,
      line_items: [lineItem],
      payment_intent_data: { metadata },
      metadata,
      success_url: `${origin}/events/${event.slug}?registered=1`,
      cancel_url: `${origin}/events/${event.slug}?registration_canceled=1`,
    });
    return Response.json({ url: checkoutSession.url, registrationId: reg.id });
  } catch (err) {
    // Don't leave an orphaned pending registration if Checkout creation fails.
    console.error("[events/register] checkout session create failed:", err);
    await db.delete(eventRegistrations).where(eq(eventRegistrations.id, reg.id));
    return Response.json({ error: "could not start checkout" }, { status: 500 });
  }
}

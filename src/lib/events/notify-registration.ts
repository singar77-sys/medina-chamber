/**
 * notifyRegistration — send the confirmation/waitlist email for a registration.
 *
 * Called from the two points a registration reaches a terminal state: the
 * register route (free RSVP confirmed, or waitlisted) and the Stripe webhook
 * (paid registration confirmed). It loads everything the email needs from the
 * registrationId alone — so both call sites just pass the id — and enriches the
 * "when"/event URL from the static scrape (matched by title + date, the same
 * bridge the registration UI uses), since the DB stores startsAt as a date-only
 * midnight-UTC value (no real clock time) and the public URL lives under the
 * static slug.
 *
 * Best-effort: never throws into the caller. A failed lookup or send is logged,
 * not surfaced — it must not roll back a registration or 500 a webhook.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  eventRegistrations,
  events,
  eventTickets,
  contacts,
} from "@/lib/db/schema";
import { events as staticEvents } from "@/data/events";
import { sendEventConfirmation } from "./event-emails";
import { formatDateWithWeekday } from "@/lib/format";

export async function notifyRegistration(registrationId: string): Promise<void> {
  try {
    const [reg] = await db
      .select({
        status: eventRegistrations.status,
        eventId: eventRegistrations.eventId,
        ticketId: eventRegistrations.ticketId,
        contactId: eventRegistrations.contactId,
        guestName: eventRegistrations.guestName,
        guestEmail: eventRegistrations.guestEmail,
        quantity: eventRegistrations.quantity,
        amountCents: eventRegistrations.amountCents,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.id, registrationId))
      .limit(1);

    if (!reg) return;
    // Only the two attendee-facing terminal states get an email.
    if (reg.status !== "confirmed" && reg.status !== "waitlisted") return;

    const [event] = await db
      .select({
        title: events.title,
        startsAt: events.startsAt,
        location: events.location,
      })
      .from(events)
      .where(eq(events.id, reg.eventId))
      .limit(1);
    if (!event) return;

    let ticketName: string | null = null;
    if (reg.ticketId) {
      const [t] = await db
        .select({ name: eventTickets.name })
        .from(eventTickets)
        .where(eq(eventTickets.id, reg.ticketId))
        .limit(1);
      ticketName = t?.name ?? null;
    }

    // Resolve the recipient: a member (contact) or a guest.
    let to: string;
    let attendeeName: string;
    if (reg.contactId) {
      const [c] = await db
        .select({
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
        })
        .from(contacts)
        .where(eq(contacts.id, reg.contactId))
        .limit(1);
      if (!c?.email) return; // can't email without an address
      to = c.email;
      attendeeName = `${c.firstName} ${c.lastName}`.trim();
    } else {
      if (!reg.guestEmail) return;
      to = reg.guestEmail;
      attendeeName = reg.guestName ?? "there";
    }

    // Enrich "when" + the public URL from the static scrape (title + UTC date).
    const dateISO = event.startsAt.toISOString().slice(0, 10);
    const staticEvent = staticEvents.find(
      (e) => e.title === event.title && e.dateISO === dateISO,
    );
    const eventWhen = staticEvent
      ? `${staticEvent.dayOfWeek}, ${staticEvent.month} ${staticEvent.day}, ${staticEvent.year} · ${staticEvent.startTime}`
      : formatDateWithWeekday(event.startsAt);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://medinaohchamber.com";
    const eventUrl = staticEvent
      ? `${siteUrl}/events/${staticEvent.slug}`
      : undefined;

    await sendEventConfirmation({
      to,
      attendeeName,
      eventTitle: event.title,
      eventWhen,
      location: event.location,
      ticketName,
      quantity: reg.quantity,
      amountCents: reg.amountCents,
      status: reg.status,
      eventUrl,
    });
  } catch (err) {
    console.error(`[events] notifyRegistration(${registrationId}) failed:`, err);
  }
}

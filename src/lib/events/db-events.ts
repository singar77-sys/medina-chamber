/**
 * DB-backed event lookups for on-site registration.
 *
 * The public event pages render from the static scrape (src/data/events.ts) and
 * link registration out to GrowthZone. This is the bridge: a published DB event
 * that has its own tickets "owns" registration on our site, so the event page
 * can point the Register button at /events/[slug]/register instead of GZ.
 *
 * Matching is by (title + event date): both the static scrape and the DB import
 * preserve the GrowthZone title and start date exactly, so (title, date) is a
 * reliable natural key. Slugs and ids CANNOT be matched — the scrape and the
 * admin-export import generate them with different conventions (different slug
 * formats; the import even synthesizes gzIds rather than carrying the real GZ
 * event id), so there is no shared identifier between the two datasets.
 */

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventTickets } from "@/lib/db/schema";

export interface RegisterableTicket {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isMemberOnly: boolean;
  maxQuantity: number | null;
  soldCount: number;
}

export interface RegisterableEvent {
  id: string;
  slug: string;
  title: string;
  isMembersOnly: boolean;
  startsAt: Date;
  location: string | null;
  maxCapacity: number | null;
  registrationCount: number;
  registrationOpenAt: Date | null;
  registrationCloseAt: Date | null;
  tickets: RegisterableTicket[];
}

/**
 * Returns the DB event + its tickets IFF the event is published and owns on-site
 * registration (has at least one ticket; a free event uses a $0 ticket). Returns
 * null otherwise — callers fall back to the external (GrowthZone) link.
 */
/**
 * The event's date as "YYYY-MM-DD" in UTC. The import stores startsAt as the
 * event date at midnight UTC (date-only — no real clock time), so the UTC date
 * is exactly the scrape's dateISO. Converting to Eastern would shift it back a
 * day (midnight UTC is the previous evening in Medina), breaking the match.
 */
function eventDateISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getRegisterableEvent(
  title: string,
  dateISO: string,
): Promise<RegisterableEvent | null> {
  // A blank/unparseable scrape date (events.json can carry `dateISO: ""`) must be
  // an explicit miss, not an accidental match — bail before the query so an event
  // with a bad date falls back to the GrowthZone link instead of silently pairing
  // with the wrong DB row.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return null;

  // (title + date) is the natural join key between the static scrape and the DB.
  const candidates = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      isMembersOnly: events.isMembersOnly,
      startsAt: events.startsAt,
      location: events.location,
      maxCapacity: events.maxCapacity,
      registrationCount: events.registrationCount,
      registrationOpenAt: events.registrationOpenAt,
      registrationCloseAt: events.registrationCloseAt,
    })
    .from(events)
    .where(and(eq(events.title, title), eq(events.status, "published")));

  const event = candidates.find((e) => eventDateISO(e.startsAt) === dateISO);
  if (!event) return null;

  const tickets = await db
    .select({
      id: eventTickets.id,
      name: eventTickets.name,
      description: eventTickets.description,
      priceCents: eventTickets.priceCents,
      isMemberOnly: eventTickets.isMemberOnly,
      maxQuantity: eventTickets.maxQuantity,
      soldCount: eventTickets.soldCount,
    })
    .from(eventTickets)
    .where(eq(eventTickets.eventId, event.id))
    .orderBy(asc(eventTickets.sortOrder));

  if (tickets.length === 0) return null; // no tickets → doesn't register on our site

  return { ...event, tickets };
}

/** Remaining capacity, or null when the event is uncapped. */
export function seatsLeft(event: RegisterableEvent): number | null {
  if (event.maxCapacity == null) return null;
  return Math.max(0, event.maxCapacity - event.registrationCount);
}

/** Whether registration is open right now (window + not yet started). */
export function registrationIsOpen(event: RegisterableEvent, now = new Date()): boolean {
  if (event.registrationOpenAt && now < event.registrationOpenAt) return false;
  if (event.registrationCloseAt && now > event.registrationCloseAt) return false;
  // startsAt is midnight-UTC date-only for imported events, so a raw `now > startsAt`
  // closes registration from ~8pm ET the night before. Treat the whole start day as
  // open; registrationCloseAt is the precise cutoff for events with a real time.
  if (event.startsAt && now.getTime() >= event.startsAt.getTime() + 24 * 60 * 60 * 1000) return false;
  return true;
}

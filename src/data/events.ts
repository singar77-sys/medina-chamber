import eventsData from "./events.json";

export interface ChamberEvent {
  slug: string;
  eventId: string;
  title: string;
  dateISO: string;
  dayOfWeek: string;
  month: string;
  day: number;
  year: number;
  startTime: string;
  endTime: string;
  dateString: string;
  location: string;
  locationDesc: string;
  venue?: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  pricing: string;
  image: string;
  registerUrl: string;
  contactName: string;
  contactPhone: string;
  detailUrl: string;
  scrapedAt: string;
}

const raw = eventsData as { generatedAt: string; totalEvents: number; events: ChamberEvent[] };

export const events: ChamberEvent[] = raw.events;
export const totalEventCount = raw.totalEvents;

export function getEventBySlug(slug: string): ChamberEvent | undefined {
  return events.find((e) => e.slug === slug);
}

export function getUpcomingEvents(now = new Date()): ChamberEvent[] {
  const today = now.toISOString().split("T")[0];
  return events.filter((e) => e.dateISO >= today);
}

export function getPastEvents(now = new Date()): ChamberEvent[] {
  const today = now.toISOString().split("T")[0];
  return events.filter((e) => e.dateISO < today);
}

/** Short human-readable date: "Wed, April 15" */
export function formatShortDate(event: ChamberEvent): string {
  return `${event.dayOfWeek.substring(0, 3)}, ${event.month} ${event.day}`;
}

/**
 * Trim a trailing "- April 2026"-style suffix from an event title.
 *
 * Used in contexts where a separate date badge already communicates the
 * month + year (e.g. homepage upcoming-event cards) — keeps every title
 * on a single line so cards stay the same height.
 *
 * Leaves the full title intact on event detail pages, JSON-LD, and
 * anywhere else the canonical name matters for SEO / accessibility.
 *
 * Strips a recognised separator + full month name + 4-digit year (e.g.
 * "- April 2026"), or a bare trailing 4-digit year on its own (e.g.
 * "Annual Chamber Golf Outing 2026" -> "Annual Chamber Golf Outing").
 * "Eggs & Expertise: Canva 101" stays whole — 101 isn't a 4-digit year.
 */
export function shortenEventTitle(title: string): string {
  return title
    .replace(
      /\s*[-, –:·]\s*(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\s*$/i,
      "",
    )
    .replace(/\s+(?:19|20)\d{2}\s*$/, "")
    .trim();
}

/** Meta description for an event page */
export function eventMetaDescription(event: ChamberEvent): string {
  const date = event.dateISO
    ? `${event.dayOfWeek}, ${event.month} ${event.day}, ${event.year}`
    : event.dateString;
  const when = event.startTime
    ? `${date} from ${event.startTime}–${event.endTime}`
    : date;
  const loc = event.city ? `in ${event.city}, OH` : "at the Chamber office";
  return `${event.title}, ${when} ${loc}. Hosted by the Greater Medina Chamber of Commerce.`;
}

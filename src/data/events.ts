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

/** Meta description for an event page */
export function eventMetaDescription(event: ChamberEvent): string {
  const date = `${event.dayOfWeek}, ${event.month} ${event.day}, ${event.year}`;
  const time = `${event.startTime}–${event.endTime}`;
  const loc = event.city ? `in ${event.city}, OH` : "at the Chamber office";
  return `${event.title} — ${date} from ${time} ${loc}. Hosted by the Greater Medina Chamber of Commerce.`;
}

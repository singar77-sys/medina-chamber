/**
 * Formats upcoming chamber events for injection into ChamberBot's system prompt.
 * Reads from the statically-built events.json and filters to future events at request time.
 */

import eventsData from "@/data/events.json";

interface RawEvent {
  slug: string;
  title: string;
  dateISO: string;
  dayOfWeek: string;
  month: string;
  day: number;
  year: number;
  startTime: string;
  endTime: string;
  location: string;
  pricing: string;
  registerUrl: string;
}

const allEvents = (eventsData as { events: RawEvent[] }).events;

/** Returns a formatted string of upcoming events for the system prompt. */
export function formatEventsForPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = allEvents.filter((e) => e.dateISO >= today).slice(0, 10);

  if (upcoming.length === 0) return "";

  const lines = upcoming.map((e) => {
    const day = e.dayOfWeek.substring(0, 3);
    const date = `${e.month} ${e.day}`;
    const time = `${e.startTime}–${e.endTime}`;
    const price = e.pricing
      ? e.pricing.split("\n")[0].replace(/\s+/g, " ").trim()
      : "";
    const url = `https://medinachamber.com/events/${e.slug}`;
    return `- ${day} ${date}: ${e.title} | ${time}${price ? ` | ${price}` : ""} | [Details & Registration](${url})`;
  });

  return `UPCOMING CHAMBER EVENTS (live from calendar — ${upcoming.length} scheduled):\n${lines.join("\n")}`;
}

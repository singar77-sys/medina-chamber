/**
 * Formats upcoming chamber events for injection into ChamberBot's system prompt.
 * Reads from the statically-built events.json and filters to future events at request time.
 */

import { getUpcomingEvents, formatShortDate } from "@/data/events";

/** Returns a formatted string of upcoming events for the system prompt. */
export function formatEventsForPrompt(): string {
  // Deliberately shares the events pages' filter: getUpcomingEvents uses the
  // chamber's Eastern calendar day, so the bot and the site can't disagree about
  // whether today's event is still upcoming (a UTC boundary drops it hours early).
  const upcoming = getUpcomingEvents().slice(0, 10);

  if (upcoming.length === 0) return "";

  const lines = upcoming.map((e) => {
    const date = formatShortDate(e);
    const time = `${e.startTime}–${e.endTime}`;
    // First THREE pricing lines, not one: enrollment-style events (e.g. the
    // FY27 Safety Council $0/$100/$345 options) put the real price menu on
    // lines 2-3, and a single-line cut hid it from the bot entirely.
    const price = e.pricing
      ? e.pricing
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join(" · ")
          .replace(/\s+/g, " ")
          .slice(0, 220)
      : "";
    const url = `https://medinachamber.com/events/${e.slug}`;
    return `- ${date}: ${e.title} | ${time}${price ? ` | ${price}` : ""} | [Details & Registration](${url})`;
  });

  return `UPCOMING CHAMBER EVENTS (live from calendar, ${upcoming.length} scheduled):\n${lines.join("\n")}`;
}

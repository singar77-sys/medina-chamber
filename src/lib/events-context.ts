/**
 * Formats upcoming chamber events for injection into ChamberBot's system prompt.
 * Reads from the statically-built events.json and filters to future events at
 * request time.
 *
 * TRUST TIER: TRUSTED (system role). The calendar is the chamber's own — staff
 * create these events in GrowthZone and the scraper copies them, and staff edit
 * them again through the CMS. Nothing here is member-authored, which is why
 * this block stays in the system role while member NEWS (news-context.ts) does
 * not.
 *
 * SOURCE: the effective-event read model, so a staff correction to a time,
 * venue, price or DATE reaches the bot the same way it reaches /events and the
 * homepage. Reading the raw scrape here would leave the bot quoting a time an
 * admin fixed weeks ago and — because the date drives the upcoming filter —
 * omitting an event that a correction moved into range.
 *
 * COMPLETENESS IS PART OF THE CONTRACT. This used to send the first TEN events
 * under the label "UPCOMING CHAMBER EVENTS (live from calendar, 10 scheduled)".
 * With 28 events on the calendar, that cut off in mid-October — so when a
 * visitor asked what was scheduled in November, the bot saw an authoritative-
 * sounding calendar with no November in it and answered that there was no
 * November programming yet, while the site's own footer advertised 28 upcoming
 * events and four November entries sat two weeks past the cut.
 *
 * The fix is to send the whole calendar (28 events ≈ 2.4k tokens, and this
 * block is inside the Anthropic-cached prefix, so the marginal cost is ~10% of
 * that on a cache hit) and to say in the header whether the list is complete.
 * If the calendar ever outgrows MAX_EVENTS_IN_PROMPT the header flips to the
 * partial wording, so the model answers "not in the list I was given" instead
 * of "there are none". Never label a subset as the calendar.
 */

import { getUpcomingEvents, formatShortDate, type ChamberEvent } from "@/data/events";
import { getEffectiveUpcomingEvents } from "@/lib/events-effective";

/**
 * Hard ceiling on events sent to the model. Today's calendar runs to 28, and a
 * chamber calendar does not plausibly reach 60 — this is a cost backstop
 * against a scraper bug duplicating rows, not an editorial choice. Crossing it
 * switches the header to the explicit "this is a subset" wording.
 */
const MAX_EVENTS_IN_PROMPT = 60;

/** Chamber-authored text still has to survive being put in a bulleted list: a
 *  stray newline in a scraped title would split one event across two lines and
 *  read as a second event. Formatting hygiene, not a trust boundary. */
function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** The chamber's calendar day, for the header only. The FILTER lives in
 *  getUpcomingEvents (same Eastern day the events pages use, so the bot and the
 *  site can never disagree about whether today's event is still upcoming); this
 *  just labels what "upcoming" was measured against. */
function easternDay(now: Date): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/** First THREE pricing lines, then a 220-char bound. The bound used to cut
 *  mid-word — the real calendar produced lines ending "however, completion o"
 *  and "Refunds will b" — which reads as corrupted data rather than as an
 *  abbreviated one, and is now repeated across the whole calendar instead of
 *  ten events. Back up to the last word boundary and mark the cut. */
function clipPricing(pricing: string): string {
  const flat = pricing
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= 220) return flat;
  const cut = flat.slice(0, 220);
  const lastSpace = cut.lastIndexOf(" ");
  // A 220-char run with no space at all is not prose; take the hard cut.
  return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:·-]+$/, "")}…`;
}

function formatEventLine(e: ChamberEvent): string {
  // Year included deliberately: the calendar runs into the next year (Safety
  // Council meets monthly through June 2027), and "Tue, January 19" with no
  // year is ambiguous exactly where a visitor asks about a specific month.
  const date = `${formatShortDate(e)}, ${e.year}`;
  // Date-only records (enrollment deadlines, the Compass cohort window) carry
  // no times. Printing a bare "–" for them looked like a missing value — and a
  // HALF-populated record printed "8:00 AM–", which looks like a dropped field.
  // Join what is actually there instead of templating both.
  const time = [e.startTime, e.endTime].filter(Boolean).join("–");
  // First THREE pricing lines, not one: enrollment-style events (e.g. the
  // FY27 Safety Council $0/$100/$345 options) put the real price menu on
  // lines 2-3, and a single-line cut hid it from the bot entirely.
  const price = e.pricing ? clipPricing(e.pricing) : "";
  const url = `https://medinachamber.com/events/${e.slug}`;
  const parts = [oneLine(e.title), time, price].filter(Boolean);
  return `- ${date}: ${parts.join(" | ")} | [Details & Registration](${url})`;
}

/** Returns a formatted string of upcoming events for the system prompt. */
export async function formatEventsForPrompt(now = new Date()): Promise<string> {
  let upcoming: ChamberEvent[];
  try {
    upcoming = await getEffectiveUpcomingEvents(now);
  } catch (err) {
    // CMS overrides are additive — every event exists in the scrape, the
    // override only corrects fields — so a failure here costs freshness, not
    // content. The caller is a chat request that reaches this BEFORE its own
    // try/catch, so the alternative to degrading is a 500 on every turn.
    console.error("[events-context] effective-event read failed:", err);
    upcoming = getUpcomingEvents(now);
  }
  return buildEventsPrompt(upcoming, easternDay(now));
}

/**
 * The formatter itself, over an already-resolved event list. Split out from
 * the read so the completeness wording can be tested against a fixed calendar
 * instead of whatever the nightly scrape happened to produce.
 */
export function buildEventsPrompt(events: ChamberEvent[], today: string): string {
  // The read model sorts, but nothing in its type says so — sort here too, so
  // "the soonest N" holds whatever the caller hands us.
  const upcoming = [...events].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

  if (upcoming.length === 0) {
    // An empty calendar is far more likely to be a data/scrape failure than a
    // chamber that genuinely scheduled nothing, so do NOT hand the model a
    // confident "there are zero events" — that is the same wrong answer this
    // block exists to prevent, just in the other direction.
    return (
      `UPCOMING CHAMBER EVENTS: the calendar feed returned no events dated on or after ${today} (Eastern). ` +
      `Do NOT tell anyone there are no chamber events — say you don't have the current calendar in front of you ` +
      `and point them to https://medinachamber.com/events.`
    );
  }

  const shown = upcoming.slice(0, MAX_EVENTS_IN_PROMPT);
  const lines = shown.map(formatEventLine);
  const complete = shown.length === upcoming.length;

  const header = complete
    ? `UPCOMING CHAMBER EVENTS — COMPLETE CALENDAR (live from the chamber calendar: all ${upcoming.length} events dated on or after ${today}, Eastern time, soonest first).\n` +
      `This IS the whole upcoming calendar, so you can answer completeness questions from it: if a month or a kind of event does not appear below, nothing of that kind is currently scheduled — say that plainly, and add that new events are added regularly and https://medinachamber.com/events is the live list.`
    : `UPCOMING CHAMBER EVENTS — PARTIAL LIST (the ${shown.length} soonest of ${upcoming.length} events dated on or after ${today}, Eastern time, soonest first).\n` +
      `This is a SUBSET, not the whole calendar. For anything after ${shown[shown.length - 1].dateISO}, say it is not in the list you were given and point to https://medinachamber.com/events — never say no such event exists.`;

  return `${header}\n${lines.join("\n")}`;
}

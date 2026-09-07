import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The effective-event read model: overrides merged BEFORE the upcoming filter
 * and the sort. Before this existed, an admin correction landed only on
 * /events/[slug] while the calendar, the homepage cards and the sitemap kept
 * serving the scraped value — and a DATE correction left the event grouped
 * and filtered under its old date.
 */

import {
  CHAMBER_OFFICE_SHORT,
  CHAMBER_OFFICE_VENUE,
  eventVenueLabel,
  eventVenueName,
} from "./event-location";

const redisMget = vi.fn<(...keys: string[]) => Promise<unknown[]>>();
/** Flipped off to exercise the "no Upstash env vars at all" path — the state
 *  every dev machine and any env-misconfigured deploy runs in. */
let redisConfigured = true;

// unstable_cache is a passthrough here — the caching is Next's; the merge, the
// sort and the outage degradation underneath it are ours.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/upstash", () => ({
  getRedis: () => (redisConfigured ? { get: vi.fn(), mget: redisMget } : null),
}));

vi.mock("../data/events.json", () => ({
  default: {
    generatedAt: "2026-09-01T00:00:00Z",
    totalEvents: 3,
    events: [
      base({ slug: "safety-council", dateISO: "2026-09-15", month: "September", day: 15 }),
      // Scraped at the chamber office — the starting state for the
      // "admin moves it off site" direction below.
      base({
        slug: "business-brew",
        dateISO: "2026-10-14",
        month: "October",
        day: 14,
        location: "139 North Court Street Suite A, Medina, OH, 44256",
        street: "139 North Court Street Suite A",
      }),
      base({ slug: "old-news", dateISO: "2026-08-01", month: "August", day: 1 }),
    ],
  },
}));

function base(over: Record<string, unknown>) {
  return {
    eventId: "e",
    title: "Event",
    dayOfWeek: "Tuesday",
    year: 2026,
    startTime: "11:30 AM",
    endTime: "1:00 PM",
    dateString: "",
    location: "787 Lafayette Road, Medina, OH, 44256",
    locationDesc: "",
    street: "787 Lafayette Road",
    city: "Medina",
    state: "OH",
    zip: "44256",
    pricing: "$24.00 PER PERSON",
    image: "",
    registerUrl: "",
    contactName: "",
    contactPhone: "",
    detailUrl: "",
    scrapedAt: "",
    ...over,
  };
}

const { getEffectiveEvents, getEffectiveUpcomingEvents } =
  await import("./events-effective");

const NOW = new Date("2026-09-07T12:00:00Z");

/** mget answers in key order; `overrides` is keyed by slug. */
function mgetReturning(overrides: Record<string, unknown>) {
  redisMget.mockImplementation(async (...keys: string[]) =>
    keys.map((k) => overrides[k.replace("cms:event:", "")] ?? null),
  );
}

describe("getEffectiveUpcomingEvents", () => {
  beforeEach(() => {
    redisMget.mockReset();
    redisConfigured = true;
  });

  it("returns the static scrape when no overrides exist", async () => {
    mgetReturning({});
    const events = await getEffectiveUpcomingEvents(NOW);
    expect(events.map((e) => e.slug)).toEqual(["safety-council", "business-brew"]);
  });

  it("applies a date/time/location/price override on the DISCOVERY surface", async () => {
    mgetReturning({
      "safety-council": {
        dateISO: "2026-11-03",
        month: "November",
        day: 3,
        startTime: "9:00 AM",
        location: "139 N. Court Street Suite A, Medina, OH, 44256",
        street: "139 N. Court Street Suite A",
        pricing: "Free",
      },
    });
    const events = await getEffectiveUpcomingEvents(NOW);
    const moved = events.find((e) => e.slug === "safety-council");
    expect(moved).toMatchObject({
      dateISO: "2026-11-03",
      month: "November",
      startTime: "9:00 AM",
      pricing: "Free",
      street: "139 N. Court Street Suite A",
    });
  });

  it("re-sorts on the OVERRIDDEN date, not the scraped one", async () => {
    // September's Safety Council is pushed past October's Business Brew — it
    // has to follow it in the rail, or the calendar shows November under
    // September's heading.
    mgetReturning({
      "safety-council": { dateISO: "2026-11-03", month: "November", day: 3 },
    });
    const events = await getEffectiveUpcomingEvents(NOW);
    expect(events.map((e) => e.slug)).toEqual(["business-brew", "safety-council"]);
  });

  it("filters on the overridden date — a past event pulled forward reappears", async () => {
    mgetReturning({
      "old-news": { dateISO: "2026-09-20", month: "September", day: 20 },
    });
    const events = await getEffectiveUpcomingEvents(NOW);
    expect(events.map((e) => e.slug)).toEqual([
      "safety-council",
      "old-news",
      "business-brew",
    ]);
  });

  it("drops an event pushed into the past by an override", async () => {
    mgetReturning({
      "business-brew": { dateISO: "2026-01-05", month: "January", day: 5 },
    });
    const events = await getEffectiveUpcomingEvents(NOW);
    expect(events.map((e) => e.slug)).toEqual(["safety-council"]);
  });

  it("degrades to the static scrape when Redis throws", async () => {
    // An Upstash outage must not 500 the homepage or the calendar.
    redisMget.mockRejectedValue(new Error("ECONNRESET"));
    const events = await getEffectiveUpcomingEvents(NOW);
    expect(events.map((e) => e.slug)).toEqual(["safety-council", "business-brew"]);
  });
});

describe("getEffectiveEvents", () => {
  beforeEach(() => {
    redisMget.mockReset();
    redisConfigured = true;
  });

  it("keeps every event, past ones included, for the sitemap", async () => {
    mgetReturning({});
    const events = await getEffectiveEvents();
    expect(events.map((e) => e.slug)).toEqual([
      "safety-council",
      "business-brew",
      "old-news",
    ]);
  });

  it("merges the override so <lastmod> tracks the corrected date", async () => {
    mgetReturning({ "old-news": { dateISO: "2026-08-19" } });
    const events = await getEffectiveEvents();
    expect(events.find((e) => e.slug === "old-news")?.dateISO).toBe("2026-08-19");
  });
});

/**
 * Read model → merge → venue formatter, in one pass. The unit tests in
 * event-location.test.ts pin the formatter; this pins that a saved override
 * actually reaches it, because `location` is scrape-only and stays stale after
 * a street correction. The three surfaces all call these same two functions on
 * the merged record: /events + the timeline rail and the homepage cards use
 * eventVenueLabel, and /events/[slug]'s location card plus the JSON-LD
 * Place.name on BOTH / and /events/[slug] use eventVenueName.
 */
describe("a saved street override reaching the discovery surfaces", () => {
  beforeEach(() => {
    redisMget.mockReset();
    redisConfigured = true;
  });

  it("moves an office event off site on the card AND in JSON-LD", async () => {
    mgetReturning({ "business-brew": { street: "787 Lafayette Road" } });
    const moved = (await getEffectiveUpcomingEvents(NOW)).find(
      (e) => e.slug === "business-brew",
    )!;
    // The scraped one-liner is untouched — this is exactly the disagreement
    // a real save produces.
    expect(moved.location).toBe("139 North Court Street Suite A, Medina, OH, 44256");
    expect(eventVenueLabel(moved)).toBe("787 Lafayette Road");
    expect(eventVenueName(moved)).toBeUndefined();
  });

  it("moves an off-site event to the office on the card AND in JSON-LD", async () => {
    mgetReturning({
      "safety-council": { street: "139 N. Court Street Suite A" },
    });
    const moved = (await getEffectiveUpcomingEvents(NOW)).find(
      (e) => e.slug === "safety-council",
    )!;
    expect(moved.location).toBe("787 Lafayette Road, Medina, OH, 44256");
    expect(eventVenueLabel(moved)).toBe(CHAMBER_OFFICE_SHORT);
    expect(eventVenueName(moved)).toBe(CHAMBER_OFFICE_VENUE);
  });

  it("labels the office correctly with no override at all", async () => {
    mgetReturning({});
    const all = await getEffectiveUpcomingEvents(NOW);
    expect(eventVenueLabel(all.find((e) => e.slug === "business-brew")!)).toBe(
      CHAMBER_OFFICE_SHORT,
    );
    expect(eventVenueLabel(all.find((e) => e.slug === "safety-council")!)).toBe(
      "787 Lafayette Road",
    );
  });
});

describe("with no Redis configured at all", () => {
  beforeEach(() => {
    redisMget.mockReset();
    redisConfigured = false;
  });

  afterEach(() => {
    redisConfigured = true;
  });

  it("serves the static scrape without touching Upstash", async () => {
    const events = await getEffectiveUpcomingEvents(NOW);
    expect(events.map((e) => e.slug)).toEqual(["safety-council", "business-brew"]);
    expect(redisMget).not.toHaveBeenCalled();
  });

  it("still returns every event for the sitemap", async () => {
    const events = await getEffectiveEvents();
    expect(events.map((e) => e.slug)).toEqual([
      "safety-council",
      "business-brew",
      "old-news",
    ]);
    expect(redisMget).not.toHaveBeenCalled();
  });
});

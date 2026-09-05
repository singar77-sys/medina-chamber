import { describe, expect, it, vi } from "vitest";

// A fixed, tiny events file so the date-window behaviour is pinned to a known
// clock instead of whatever the nightly scrape happened to produce.
vi.mock("./events.json", () => ({
  default: {
    generatedAt: "2026-09-01T00:00:00Z",
    totalEvents: 4,
    events: [
      base({ slug: "today", dateISO: "2026-09-03", month: "September", day: 3 }),
      base({ slug: "tomorrow", dateISO: "2026-09-04", month: "September", day: 4 }),
      base({ slug: "yesterday", dateISO: "2026-09-02", month: "September", day: 2 }),
      // The scraper could not read a date for this one. It must appear in
      // NEITHER list — it used to render a "0" date chip at the top of the
      // homepage listing.
      base({ slug: "undated", dateISO: "", month: "", day: 0, dateString: "Date TBD" }),
    ],
  },
}));

function base(over: Record<string, unknown>) {
  return {
    eventId: "e",
    title: "Chamber Chat",
    dayOfWeek: "Thursday",
    year: 2026,
    startTime: "",
    endTime: "",
    dateString: "",
    location: "",
    locationDesc: "",
    street: "",
    city: "Medina",
    state: "OH",
    zip: "44256",
    pricing: "",
    image: "",
    registerUrl: "",
    contactName: "",
    contactPhone: "",
    detailUrl: "",
    scrapedAt: "",
    ...over,
  };
}

const {
  getUpcomingEvents,
  getPastEvents,
  getEventBySlug,
  shortenEventTitle,
  eventMetaDescription,
} = await import("./events");

// 03:30 UTC on Sep 4 is 23:30 ET on Sep 3 — the boundary that used to drop
// same-day events from the listings hours early.
const LATE_ON_SEP_3 = new Date("2026-09-04T03:30:00Z");

describe("getUpcomingEvents", () => {
  it("still shows a same-day event at 23:30 Eastern", () => {
    expect(getUpcomingEvents(LATE_ON_SEP_3).map((e) => e.slug)).toEqual(["today", "tomorrow"]);
  });

  it("excludes an event the scraper could not date", () => {
    expect(getUpcomingEvents(LATE_ON_SEP_3).some((e) => e.slug === "undated")).toBe(false);
  });
});

describe("getPastEvents", () => {
  it("returns only dated events before today Eastern", () => {
    expect(getPastEvents(LATE_ON_SEP_3).map((e) => e.slug)).toEqual(["yesterday"]);
  });
});

describe("getEventBySlug", () => {
  it("finds a known slug and returns undefined otherwise", () => {
    expect(getEventBySlug("today")?.slug).toBe("today");
    expect(getEventBySlug("nope")).toBeUndefined();
  });
});

describe("shortenEventTitle", () => {
  it("drops a trailing month+year or bare year", () => {
    expect(shortenEventTitle("Chamber Chat - April 2026")).toBe("Chamber Chat");
    expect(shortenEventTitle("Annual Chamber Golf Outing 2026")).toBe("Annual Chamber Golf Outing");
  });

  it("leaves a title whose trailing number is not a year", () => {
    expect(shortenEventTitle("Eggs & Expertise: Canva 101")).toBe("Eggs & Expertise: Canva 101");
  });
});

describe("eventMetaDescription", () => {
  it("omits the time range for a date-only event", () => {
    const meta = eventMetaDescription(getEventBySlug("today")!);
    expect(meta).toContain("Thursday, September 3, 2026");
    expect(meta).not.toContain("from");
  });

  it("falls back to dateString when there is no parsed date", () => {
    expect(eventMetaDescription(getEventBySlug("undated")!)).toContain("Date TBD");
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseEventSubtitle } from "./lib-event-subtitle.mjs";
import { htmlToText } from "./lib-html-to-text.mjs";

/**
 * scrape-events.mjs rewrites src/data/events.json unattended every night with
 * nothing between GrowthZone's markup and the live site. Two production bugs
 * have come out of this one file:
 *
 *   - a date-only subtitle ("Wednesday, September 30, 2026") failed the
 *     date+time regex, so day/year fell to 0 and the homepage rendered a
 *     literal "0" chip while the event dropped off every chronological list;
 *   - a Froala <br> WITH attributes was eaten by the generic tag strip, fusing
 *     "$25 per person" and "For your convenience" into "personFor" in the
 *     rendered pricing block.
 *
 * Both are silent: the scrape succeeds, the JSON is written, the site ships.
 */

// Every real subtitle carries a trailing timezone group; the scraper strips it.
const ORIGINAL_TZ = process.env.TZ;
beforeEach(() => {
  // toISO() builds a LOCAL Date and reads it back as UTC, so the result depends
  // on the machine's zone. Pin it to the chamber's zone (which is what the
  // committed events.json was produced in) so these assertions are stable.
  process.env.TZ = "America/New_York";
});
afterEach(() => {
  // TZ is commonly unset; assigning `undefined` back stringifies to the literal
  // "undefined", which Node rejects and silently falls back to UTC — leaking a
  // zone change into every later test file sharing this worker.
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe("parseEventSubtitle - full date + time range", () => {
  it("parses the shape GrowthZone actually emits, timezone group and all", () => {
    expect(
      parseEventSubtitle("Tuesday, September 8, 2026 (11:30 AM - 1:00 PM) (EDT)"),
    ).toEqual({
      // The trailing "(EDT)" is stripped; the time range survives.
      dateString: "Tuesday, September 8, 2026 (11:30 AM - 1:00 PM)",
      dayOfWeek: "Tuesday",
      month: "September",
      day: 8,
      year: 2026,
      startTime: "11:30 AM",
      endTime: "1:00 PM",
      dateISO: "2026-09-08",
    });
  });

  it("accepts an en dash between the times as well as a hyphen", () => {
    // GrowthZone's editor emits both depending on who typed the event.
    const hyphen = parseEventSubtitle("Friday, October 3, 2026 (9:00 AM - 10:00 AM) (EDT)");
    const enDash = parseEventSubtitle("Friday, October 3, 2026 (9:00 AM – 10:00 AM) (EDT)");
    expect(hyphen.startTime).toBe("9:00 AM");
    expect(enDash.startTime).toBe("9:00 AM");
    expect(enDash.endTime).toBe("10:00 AM");
    expect(enDash.dateISO).toBe("2026-10-03");
  });

  it("is case-insensitive about the meridiem", () => {
    const out = parseEventSubtitle("Monday, December 1, 2026 (12:00 pm - 1:00 pm) (EST)");
    expect(out.startTime).toBe("12:00 pm");
    expect(out.day).toBe(1);
  });

  it("trims surrounding whitespace before parsing", () => {
    const out = parseEventSubtitle("   Tuesday, September 8, 2026 (11:30 AM - 1:00 PM) (EDT)   ");
    expect(out.dateString).toBe("Tuesday, September 8, 2026 (11:30 AM - 1:00 PM)");
    expect(out.day).toBe(8);
  });
});

describe("parseEventSubtitle - date-only subtitle (the '0' chip regression)", () => {
  it("still yields a real day, year and dateISO with no time range", () => {
    // This is the exact bug: before the date-only fallback existed, day and
    // year were 0 and dateISO was "", so the homepage chip read "0" and the
    // event vanished from every date-sorted listing.
    expect(parseEventSubtitle("Wednesday, September 9, 2026")).toEqual({
      dateString: "Wednesday, September 9, 2026",
      dayOfWeek: "Wednesday",
      month: "September",
      day: 9,
      year: 2026,
      startTime: "",
      endTime: "",
      dateISO: "2026-09-09",
    });
  });

  it("handles a date-only subtitle that still carries a timezone group", () => {
    const out = parseEventSubtitle("Wednesday, September 30, 2026 (EDT)");
    expect(out.day).toBe(30);
    expect(out.dateISO).toBe("2026-09-30");
    expect(out.startTime).toBe("");
  });

  it("never returns day 0 for a subtitle it could parse", () => {
    for (const s of [
      "Wednesday, September 9, 2026",
      "Tuesday, September 8, 2026 (11:30 AM - 1:00 PM) (EDT)",
      "Saturday, January 31, 2027",
    ]) {
      const out = parseEventSubtitle(s);
      expect(out.day, s).toBeGreaterThan(0);
      expect(out.year, s).toBeGreaterThan(2000);
      expect(out.dateISO, s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("parseEventSubtitle - empty and unparseable input", () => {
  const EMPTY = {
    dateString: "",
    dayOfWeek: "",
    month: "",
    day: 0,
    year: 0,
    startTime: "",
    endTime: "",
    dateISO: "",
  };

  it.each([
    ["empty string", ""],
    ["whitespace only", "   "],
    ["undefined (no .gz-subtitle node on the page)", undefined],
    ["null", null],
  ])("returns the all-empty shape for %s and does not throw", (_label, input) => {
    // The scraper must not crash on one malformed detail page; a thrown
    // TypeError here would abort the whole nightly run.
    expect(parseEventSubtitle(input as string | undefined)).toEqual(EMPTY);
  });

  it("returns day 0 / blank dateISO for a subtitle that is not a date", () => {
    // A "0" on the homepage chip is the SYMPTOM of this branch. It is correct
    // for the parser to fail here; the fix belongs in the renderer or the
    // source data, so this pins that day===0 means "unparsed", not "the 0th".
    const out = parseEventSubtitle("Multiple Dates - see description (EDT)");
    expect(out.day).toBe(0);
    expect(out.year).toBe(0);
    expect(out.dateISO).toBe("");
    expect(out.dateString).toBe("Multiple Dates - see description");
  });
});

describe("parseEventSubtitle - documented sharp edges", () => {
  it("strips only the LAST parenthesised group, so a zone-less subtitle loses its times", () => {
    // Live GrowthZone always appends "(EDT)"/"(EST)", so the time range is
    // never the last group in practice. If that ever changes, every event
    // silently loses startTime/endTime - this test is the tripwire.
    const out = parseEventSubtitle("Tuesday, September 8, 2026 (11:30 AM - 1:00 PM)");
    expect(out.dateString).toBe("Tuesday, September 8, 2026");
    expect(out.startTime).toBe("");
    expect(out.endTime).toBe("");
    // The date itself still survives via the date-only fallback.
    expect(out.day).toBe(8);
    expect(out.dateISO).toBe("2026-09-08");
  });

  it("falls back to January for an unrecognised month name", () => {
    // MONTHS[month] ?? 0. A localised or abbreviated month would silently
    // produce a January date rather than a blank one.
    const out = parseEventSubtitle("Tuesday, Sept 8, 2026");
    expect(out.month).toBe("Sept");
    expect(out.dateISO).toBe("2026-01-08");
  });

  it("dateISO is machine-timezone dependent (UTC+ zones shift it a day earlier)", () => {
    // toISO builds a LOCAL midnight Date and reads it back with toISOString().
    // Documented, not fixed, because the scraper runs in US Eastern and
    // changing it would rewrite every date in events.json.
    const subtitle = "Wednesday, September 30, 2026 (EDT)";
    process.env.TZ = "America/New_York";
    expect(parseEventSubtitle(subtitle).dateISO).toBe("2026-09-30");
    process.env.TZ = "Asia/Tokyo";
    expect(parseEventSubtitle(subtitle).dateISO).toBe("2026-09-29");
  });
});

describe("event pricing block - the 'personFor' fusion regression", () => {
  // scrape-events.mjs runs .gz-event-pricing-info and .gz-event-description
  // through htmlToText, and the renderers split the result on newlines.
  it("keeps an attributed Froala <br ...> as a line break", () => {
    const pricingHtml =
      "$25 per person<br fr-original-style=\"\" style=\"\">For your convenience, " +
      "payment is due at registration.";
    const out = htmlToText(pricingHtml);
    expect(out).toBe(
      "$25 per person\nFor your convenience, payment is due at registration.",
    );
    // The shipped bug, verbatim.
    expect(out).not.toContain("personFor");
  });

  it("keeps a plain <br> and a self-closing <br /> as line breaks too", () => {
    expect(htmlToText("$25 per person<br>For your convenience")).toBe(
      "$25 per person\nFor your convenience",
    );
    expect(htmlToText("$25 per person<br />For your convenience")).toBe(
      "$25 per person\nFor your convenience",
    );
  });

  it("separates sibling block elements in a pricing table", () => {
    expect(htmlToText("<div>Members $25</div><div>Guests $35</div>")).toBe(
      "Members $25\nGuests $35",
    );
  });

  it("returns an empty string when the pricing block is absent", () => {
    // parseDetailPage passes '' when .gz-event-pricing-info is missing.
    expect(htmlToText("")).toBe("");
    expect(htmlToText()).toBe("");
  });
});

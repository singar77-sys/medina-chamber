import { describe, expect, it } from "vitest";

import {
  formatCents,
  formatDateLong,
  formatDateShort,
  formatDateWithWeekday,
} from "./format";

describe("formatCents", () => {
  it("renders a whole-dollar amount with both cents digits", () => {
    // The shape this helper exists to kill: a bare toLocaleString renders
    // 575000 cents as "5,750" and 5750 as "57.5".
    expect(formatCents(575000)).toBe("$5,750.00");
  });

  it("renders 5750 cents as $57.50", () => {
    // The original bug was a template literal with no `style: "currency"` at all
    // (renewal-engine.ts), which printed "$57.5". Under style:"currency" the USD
    // minor-unit default already caps at 2, so this is a regression pin for the
    // day someone changes the style option, not a demonstration of that bug.
    expect(formatCents(5750)).toBe("$57.50");
  });

  it("renders zero as $0.00", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("groups thousands above 1,000,000 cents", () => {
    expect(formatCents(123456789)).toBe("$1,234,567.89");
    expect(formatCents(100000000)).toBe("$1,000,000.00");
  });

  it("rounds a fractional cent rather than growing digits", () => {
    expect(formatCents(1999)).toBe("$19.99");
  });
});

describe("date-only formatters", () => {
  // A date-only value is either "YYYY-MM-DD" or a Date pinned to midnight UTC.
  // Midnight UTC is 8pm the PREVIOUS day in America/New_York, so a formatter
  // that resolved to Eastern time would report July 16 for the event below.
  // These assertions are the regression guard on that.
  const ISO = "2026-07-17";
  const MIDNIGHT_UTC = new Date("2026-07-17T00:00:00Z");

  it("formatDateLong renders the stored calendar day", () => {
    expect(formatDateLong(ISO)).toBe("July 17, 2026");
    expect(formatDateLong(MIDNIGHT_UTC)).toBe("July 17, 2026");
  });

  it("formatDateShort renders the stored calendar day", () => {
    expect(formatDateShort(ISO)).toBe("Jul 17, 2026");
    expect(formatDateShort(MIDNIGHT_UTC)).toBe("Jul 17, 2026");
  });

  it("formatDateWithWeekday renders the stored calendar day and its weekday", () => {
    expect(formatDateWithWeekday(ISO)).toBe("Friday, July 17, 2026");
    expect(formatDateWithWeekday(MIDNIGHT_UTC)).toBe("Friday, July 17, 2026");
  });

  it("does not slip to the previous day at the Eastern boundary", () => {
    // Jan 1 midnight UTC is Dec 31, 7pm ET — the worst case, since it crosses
    // the year too.
    expect(formatDateLong("2026-01-01")).toBe("January 1, 2026");
    expect(formatDateWithWeekday("2026-01-01")).toBe("Thursday, January 1, 2026");
  });

  it("renders a nullish date as an em dash", () => {
    expect(formatDateLong(null)).toBe("—");
    expect(formatDateLong(undefined)).toBe("—");
    expect(formatDateShort(null)).toBe("—");
    expect(formatDateShort(undefined)).toBe("—");
  });
});

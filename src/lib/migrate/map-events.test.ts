import { describe, expect, it } from "vitest";
import {
  deriveEvents,
  eventKeyFor,
  mapRegistration,
  mapRegistrationStatus,
} from "@/lib/migrate/map-events";
import type { Row } from "@/lib/migrate/load";

/**
 * Fixtures are the REAL sample rows from the GrowthZone "Event Attendees
 * Report" export (verbatim headers + values, including the fractional Excel
 * serial dates).
 */
const HEADERS = [
  "Event Name",
  "Attendee Name",
  "Attendee Account Number",
  "Primary Membership Status",
  "Attendee Organization Name",
  "Event Start Date",
  "Registration Date",
  "Registration Status",
  "Registered Count",
  "Attended Count",
  "Paid Registrations",
  "Paid Fees",
  "Unpaid Registrations",
  "Unpaid Fees",
  "ContactId",
  "Individual Purchase Amount",
  "Registration Type",
] as const;

function toRow(values: unknown[]): Row {
  const row: Row = {};
  HEADERS.forEach((h, i) => {
    row[h] = values[i] ?? "";
  });
  return row;
}

// Golf outing: numeric ContactId, blank Individual Purchase Amount + 0 Paid
// Fees, "Registered", attended 0, fractional Excel date 45859.395833...
const golfRow = toRow([
  "Annual Chamber Golf Outing 2025",
  "Todd Daubenmire",
  "",
  "Non Member",
  "RMD Company LLC",
  45859.395833333336,
  45743.66674212963,
  "Registered",
  1,
  0,
  1,
  0,
  0,
  "",
  28154029,
  "",
  "Non-Member - Foursome",
]);

// Networking WOW: Individual Purchase Amount = 12 (number), Paid Fees = 12.
const wowRow = toRow([
  "Networking WOW - November 2024",
  "Emily Giangiulio",
  "",
  "Dropped",
  "Traditions Health",
  45616.354166666664,
  45609.41914568287,
  "Registered",
  1,
  0,
  1,
  12,
  0,
  "",
  22910625,
  12,
  "Member Registration",
]);

describe("eventKeyFor", () => {
  it("collapses the fractional Excel date to a calendar day in the key", () => {
    // 45859.3958 → 2025-07-21 (whole-serial day), regardless of time fraction.
    expect(eventKeyFor(golfRow)).toBe("Annual Chamber Golf Outing 2025|2025-07-21");
  });

  it("derives a key from name + date for the second fixture", () => {
    expect(eventKeyFor(wowRow)).toBe("Networking WOW - November 2024|2024-11-20");
  });
});

describe("deriveEvents", () => {
  it("produces one event per distinct (name + date), deduping repeat rows", () => {
    // Two golf rows (same event), one WOW row → 2 distinct events.
    const events = deriveEvents([golfRow, golfRow, wowRow]);
    expect(events).toHaveLength(2);
  });

  it("maps the golf event to a completed, slugged, gz-keyed event insert", () => {
    const [golf] = deriveEvents([golfRow]);
    expect(golf.title).toBe("Annual Chamber Golf Outing 2025");
    expect(golf.slug).toBe("annual-chamber-golf-outing-2025-2025-07-21");
    expect(golf.gzId).toBe("gz-event-annual-chamber-golf-outing-2025-2025-07-21");
    expect(golf.status).toBe("completed");
    expect(golf.eventKey).toBe("Annual Chamber Golf Outing 2025|2025-07-21");
  });

  it("sets startsAt to UTC-midnight of the source calendar day", () => {
    const [golf] = deriveEvents([golfRow]);
    expect(golf.startsAt).toBeInstanceOf(Date);
    expect((golf.startsAt as Date).toISOString()).toBe("2025-07-21T00:00:00.000Z");
  });

  it("skips rows with no event name", () => {
    const blank = toRow([]);
    expect(deriveEvents([blank])).toHaveLength(0);
  });

  it("skips footer rows whose Event Start Date is blank (null isoDate)", () => {
    // Events-export footer shape: Event Name has the "Generated…by…" marker,
    // Event Start Date is blank. Even if the name were not a footer marker,
    // a null/blank start date must not produce a row (startsAt is notNull).
    const footerRow = toRow([
      "Generated 6/17/2026 5:52:05 PM by Mark Hunter",
      "8112", // Attendee Name cell
      "",
      "",
      "",
      "", // blank Event Start Date
    ]);
    expect(deriveEvents([footerRow])).toHaveLength(0);
  });

  it("skips a row with a non-empty event name but unparseable/blank start date", () => {
    // A row that somehow passed name-check but has no parseable date must be
    // dropped rather than emitting startsAt=null into a notNull column.
    const noDate = toRow([
      "Some Real-Looking Event",
      "Attendee",
      "",
      "",
      "",
      "", // blank start date
    ]);
    expect(deriveEvents([noDate])).toHaveLength(0);
  });
});

describe("mapRegistrationStatus", () => {
  it("maps Registered → confirmed", () => {
    expect(mapRegistrationStatus("Registered", 0)).toBe("confirmed");
  });

  it("maps Attended → attended", () => {
    expect(mapRegistrationStatus("Attended", 0)).toBe("attended");
  });

  it("forces attended when Attended Count > 0 even if labelled Registered", () => {
    expect(mapRegistrationStatus("Registered", 1)).toBe("attended");
  });

  it("maps Canceled and Declined → cancelled", () => {
    expect(mapRegistrationStatus("Canceled", 0)).toBe("cancelled");
    expect(mapRegistrationStatus("Declined", 0)).toBe("cancelled");
  });

  it("maps Waiting List → waitlisted", () => {
    expect(mapRegistrationStatus("Waiting List", 0)).toBe("waitlisted");
  });

  it("maps No Show → confirmed (registered but absent, not cancelled)", () => {
    expect(mapRegistrationStatus("No Show", 0)).toBe("confirmed");
  });

  it("maps blank / unknown → pending", () => {
    expect(mapRegistrationStatus("", 0)).toBe("pending");
    expect(mapRegistrationStatus("Something Else", 0)).toBe("pending");
  });
});

describe("mapRegistration", () => {
  it("falls back to Paid Fees when Individual Purchase Amount is blank", () => {
    // Golf row: Individual Purchase Amount "" and Paid Fees 0 → 0 cents.
    const golf = mapRegistration(golfRow);
    expect(golf.amountCents).toBe(0);
  });

  it("uses Individual Purchase Amount for cents when present", () => {
    // WOW row: Individual Purchase Amount 12 → 1200 cents.
    const wow = mapRegistration(wowRow);
    expect(wow.amountCents).toBe(1200);
  });

  it("emits a numeric gzContactId and always sets guestName", () => {
    const golf = mapRegistration(golfRow);
    expect(golf.gzContactId).toBe(28154029);
    expect(golf.guestName).toBe("Todd Daubenmire");
    expect(golf.guestEmail).toBeNull();
  });

  it("carries the event key so the orchestrator can resolve the event FK", () => {
    const golf = mapRegistration(golfRow);
    expect(golf.eventKey).toBe("Annual Chamber Golf Outing 2025|2025-07-21");
  });

  it("uses Registered Count for quantity (floor of 1)", () => {
    expect(mapRegistration(golfRow).quantity).toBe(1);
  });

  it("maps Registered (attended 0) → confirmed status", () => {
    expect(mapRegistration(golfRow).status).toBe("confirmed");
  });

  it("sets gzContactId null when ContactId is non-numeric", () => {
    const junk = toRow([
      "Some Event",
      "Guest Person",
      "",
      "Non Member",
      "Org",
      45859,
      45743,
      "Registered",
      1,
      0,
      1,
      0,
      0,
      "",
      "Totals",
      "",
      "Walk-in",
    ]);
    const r = mapRegistration(junk);
    expect(r.gzContactId).toBeNull();
    expect(r.guestName).toBe("Guest Person");
  });
});

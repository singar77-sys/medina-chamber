import { describe, expect, it } from "vitest";
import {
  CHAMBER_OFFICE_SHORT,
  CHAMBER_OFFICE_VENUE,
  eventVenueLabel,
  eventVenueName,
  isChamberOfficeAddress,
} from "./event-location";
import eventsData from "../data/events.json";

/**
 * The bug this guards: every surface used to label ANY location string
 * starting with a digit "Chamber Office". 16 of the 28 upcoming events in
 * src/data/events.json are somewhere else entirely, so the calendar sent
 * people to the wrong building — including the State of the City address at
 * 787 Lafayette Rd. and every Safety Council meeting.
 */

// Verbatim from src/data/events.json — both spellings the scrape produces,
// plus the abbreviated form used in hand-written fallbacks.
const OFFICE_SPELLINGS = [
  "139 North Court Street Suite A, Medina, OH, 44256",
  "139 N. Court Street Suite A, Medina, OH, 44256",
  "139 N Court St, Medina, OH, 44256",
  "139 N. Court Street, Suite A",
];

// Verbatim from src/data/events.json — real venues that are NOT the office.
const OFF_SITE = [
  "787 Lafayette Rd., Medina, OH, 44256",
  "787 Lafayette Road, Medina, OH, 44256",
  "236 N State Rd, Medina, OH, 44256",
  "144 N. Court Street, Medina, OH, 44256",
  "333 Foundry St, Medina, OH, 44256",
  "325 W Smith Rd., Medina, OH, 44256",
];

describe("isChamberOfficeAddress", () => {
  it.each(OFFICE_SPELLINGS)("recognises %s", (loc) => {
    expect(isChamberOfficeAddress(loc)).toBe(true);
  });

  it.each(OFF_SITE)("rejects %s", (loc) => {
    expect(isChamberOfficeAddress(loc)).toBe(false);
  });

  it("does not confuse 144 N. Court Street with 139", () => {
    // Business Brew's October host is four doors down from the office.
    expect(isChamberOfficeAddress("144 N. Court Street")).toBe(false);
  });

  it("does not match a longer street number that ends in 139", () => {
    expect(isChamberOfficeAddress("1139 N Court St")).toBe(false);
  });

  it.each([
    "139 N Ct St",
    "139 N. Ct. St.",
    "139 North Ct Street",
  ])("recognises the abbreviated Court spelling %s", (loc) => {
    // These used to fall through and render as a bare street address.
    expect(isChamberOfficeAddress(loc)).toBe(true);
  });

  it.each([
    "Parking lot across from 139 N Court St",
    "Municipal lot behind 139 N Court Street",
    "The green space opposite 139 North Court Street",
  ])("rejects %s — the office is the landmark, not the venue", (loc) => {
    expect(isChamberOfficeAddress(loc)).toBe(false);
  });

  it("still matches when the office follows a venue name or a suite", () => {
    // Mid-string matching is deliberate: it is what tolerates these forms.
    expect(isChamberOfficeAddress("Suite A, 139 N Court St")).toBe(true);
    expect(
      isChamberOfficeAddress("Greater Medina Chamber, 139 N. Court Street, Medina"),
    ).toBe(true);
  });

  it("returns false for a missing address", () => {
    expect(isChamberOfficeAddress(undefined)).toBe(false);
    expect(isChamberOfficeAddress("")).toBe(false);
  });
});

describe("eventVenueLabel", () => {
  it.each(OFFICE_SPELLINGS)("labels %s as the chamber office", (location) => {
    expect(eventVenueLabel({ location })).toBe(CHAMBER_OFFICE_SHORT);
  });

  it.each(OFF_SITE)("never labels %s as the chamber office", (location) => {
    expect(eventVenueLabel({ location })).not.toBe(CHAMBER_OFFICE_SHORT);
  });

  it("shows the real street for an off-site address", () => {
    expect(eventVenueLabel({ location: "787 Lafayette Rd., Medina, OH, 44256" })).toBe(
      "787 Lafayette Rd.",
    );
    expect(eventVenueLabel({ location: "333 Foundry St, Medina, OH, 44256" })).toBe(
      "333 Foundry St",
    );
  });

  it("prefers an explicit venue field over any address guess", () => {
    expect(
      eventVenueLabel({
        venue: "Foundry Social",
        location: "333 Foundry St, Medina, OH, 44256",
      }),
    ).toBe("Foundry Social");
    // An explicit venue wins even at the office address.
    expect(
      eventVenueLabel({
        venue: "Chamber Boardroom",
        location: "139 North Court Street Suite A, Medina, OH, 44256",
      }),
    ).toBe("Chamber Boardroom");
  });

  it("passes through a location that is already a venue name", () => {
    expect(
      eventVenueLabel({ location: "Westfield Country Club, 1 Park Circle, Westfield" }),
    ).toBe("Westfield Country Club");
  });

  it("returns null when there is no location at all", () => {
    expect(eventVenueLabel({})).toBeNull();
    expect(eventVenueLabel({ location: "", street: "" })).toBeNull();
  });

  it("falls back to the street field when location is empty", () => {
    expect(eventVenueLabel({ location: "", street: "787 Lafayette Road" })).toBe(
      "787 Lafayette Road",
    );
    expect(eventVenueLabel({ location: "", street: "139 N Court St" })).toBe(
      CHAMBER_OFFICE_SHORT,
    );
  });
});

describe("eventVenueName", () => {
  it.each(OFFICE_SPELLINGS)("names %s as the chamber", (location) => {
    expect(eventVenueName({ location })).toBe(CHAMBER_OFFICE_VENUE);
  });

  it("stays undefined for an off-site address rather than inventing a venue", () => {
    // JSON-LD Place.name is omitted rather than filled with a street address.
    for (const location of OFF_SITE) {
      expect(eventVenueName({ location })).toBeUndefined();
    }
  });

  it("uses an explicit venue or an already-named location", () => {
    expect(eventVenueName({ venue: "Foundry Social" })).toBe("Foundry Social");
    expect(eventVenueName({ location: "Westfield Country Club, 1 Park Circle" })).toBe(
      "Westfield Country Club",
    );
  });

  it("returns undefined with no location", () => {
    expect(eventVenueName({})).toBeUndefined();
  });
});

/**
 * THE OVERRIDE DISAGREEMENT CASE.
 *
 * `street` is the field the admin event editor writes; `location` is scrape-
 * only (EventEditor never sends it, and every scraped record has a non-empty
 * one). So the ONLY state a real correction produces is the two disagreeing —
 * and preferring `location` made every street override inert: staff could move
 * an event to 787 Lafayette Road and the card still read "Chamber Office",
 * while the detail page printed "Greater Medina Chamber of Commerce" directly
 * above the corrected street, and shipped that name in JSON-LD on both / and
 * /events/[slug].
 */
describe("an admin street override disagreeing with the scraped location", () => {
  // Exactly what {...scraped, ...cmsOverride} produces for the-compass-program
  // after staff correct the street. `location` stays as the scrape left it.
  const movedOffSite = {
    location: "139 North Court Street Suite A, Medina, OH, 44256",
    street: "787 Lafayette Road",
  };

  // The reverse: an off-site scrape corrected back to the office.
  const movedToOffice = {
    location: "333 Foundry St, Medina, OH, 44256",
    street: "139 N. Court Street Suite A",
  };

  it("does not label an event moved OFF SITE as the chamber office", () => {
    // Card + timeline rail (/events, homepage).
    expect(eventVenueLabel(movedOffSite)).not.toBe(CHAMBER_OFFICE_SHORT);
    expect(eventVenueLabel(movedOffSite)).toBe("787 Lafayette Road");
  });

  it("does not NAME an event moved off site as the chamber", () => {
    // Detail-page location card AND the Place.name in both JSON-LD blocks —
    // one wrong name here contradicts the street printed beside it.
    expect(eventVenueName(movedOffSite)).not.toBe(CHAMBER_OFFICE_VENUE);
    expect(eventVenueName(movedOffSite)).toBeUndefined();
  });

  it("labels an event moved TO the office as the office", () => {
    expect(eventVenueLabel(movedToOffice)).toBe(CHAMBER_OFFICE_SHORT);
    expect(eventVenueName(movedToOffice)).toBe(CHAMBER_OFFICE_VENUE);
  });

  it("still trusts the scraped venue name while it agrees with the street", () => {
    // No override: the location one-liner names the venue and the street
    // matches it, so the name is still worth using.
    const agreeing = {
      location: "Foundry Social, 333 Foundry St, Medina, OH, 44256",
      street: "333 Foundry St",
    };
    expect(eventVenueLabel(agreeing)).toBe("Foundry Social");
    expect(eventVenueName(agreeing)).toBe("Foundry Social");
  });

  it("drops a stale scraped venue name once the street is corrected away", () => {
    const stale = {
      location: "Foundry Social, 333 Foundry St, Medina, OH, 44256",
      street: "236 N State Rd",
    };
    expect(eventVenueLabel(stale)).toBe("236 N State Rd");
    expect(eventVenueName(stale)).toBeUndefined();
  });

  it("lets an explicit venue short-circuit the whole question", () => {
    // The mitigation to tell staff: set `venue` and nothing else is consulted.
    expect(eventVenueLabel({ ...movedOffSite, venue: "Fire-Dex" })).toBe("Fire-Dex");
    expect(eventVenueName({ ...movedOffSite, venue: "Fire-Dex" })).toBe("Fire-Dex");
  });
});

describe("scraper placeholders are never emitted as a JSON-LD venue name", () => {
  // The weekly scrape is unvalidated; a non-numeric location prefix used to be
  // promoted straight into Place.name next to a real PostalAddress.
  it.each(["TBD", "TBA", "Online", "Virtual", "Various Locations", "N/A", "Suite A"])(
    "%s is not a venue name",
    (location) => {
      expect(eventVenueName({ location })).toBeUndefined();
    },
  );

  it("but a real venue name still is", () => {
    expect(eventVenueName({ location: "Foundry Social, 333 Foundry St" })).toBe(
      "Foundry Social",
    );
  });
});

/**
 * Real-data guard. The fixtures above pin the rules; this pins them against
 * whatever the nightly scrape actually produced, so a future location format
 * can't quietly reintroduce the "starts with a digit → Chamber Office" bug.
 */
describe("every scraped event record", () => {
  const { events } = eventsData as {
    events: { slug: string; location: string; street: string }[];
  };

  it("has records to check", () => {
    expect(events.length).toBeGreaterThan(0);
  });

  it("never labels a non-office address as the chamber office", () => {
    const wrong = events.filter(
      (e) =>
        eventVenueLabel(e) === CHAMBER_OFFICE_SHORT &&
        !/139\D+court/i.test(`${e.location} ${e.street}`),
    );
    expect(wrong.map((e) => `${e.slug} @ ${e.location}`)).toEqual([]);
  });

  it("never names a non-office address as the chamber organisation", () => {
    const wrong = events.filter(
      (e) =>
        eventVenueName(e) === CHAMBER_OFFICE_VENUE &&
        !/139\D+court/i.test(`${e.location} ${e.street}`),
    );
    expect(wrong.map((e) => `${e.slug} @ ${e.location}`)).toEqual([]);
  });

  it("shows a venue label for every record that has any address", () => {
    const missing = events.filter((e) => (e.location || e.street) && !eventVenueLabel(e));
    expect(missing.map((e) => e.slug)).toEqual([]);
  });

  it("never uses a bare street address as a JSON-LD venue name", () => {
    const numeric = events.filter((e) => /^\d/.test(eventVenueName(e) ?? ""));
    expect(numeric.map((e) => e.slug)).toEqual([]);
  });
});

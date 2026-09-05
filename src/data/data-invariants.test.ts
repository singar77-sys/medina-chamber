import { describe, expect, it } from "vitest";
import eventsData from "./events.json";
import membersData from "./members.json";
import overridesData from "./member-overrides.json";
import { COMMUNITY_INVESTOR_SLUGS, VISIBILITY_PLUS_SLUGS } from "./tier-overrides";

// events.json and members.json are rewritten by the nightly/weekly scrapers and
// pushed straight to main, where CI runs this suite. The hand-maintained slug
// tables (tier-overrides, member-overrides) are NOT rewritten, so a scraper-side
// rename silently demotes a Community Investor to a plain card and drops their
// logo and search enrichment. That drift is free to catch here.
//
// The homepage "0" date chip came from the same class of problem: an event whose
// subtitle the scraper could not parse landed with day: 0 and month: "".

const events = (eventsData as { events: Array<Record<string, unknown>> }).events;
const members = (membersData as { members: Array<{ chamberSlug: string }> }).members;
const memberSlugs = new Set(members.map((m) => m.chamberSlug));
const overrideSlugs = Object.keys(
  (overridesData as { overrides: Record<string, unknown> }).overrides,
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return [...new Set(values.filter((v) => (seen.has(v) ? true : (seen.add(v), false))))];
}

describe("events.json", () => {
  it("has events at all", () => {
    expect(events.length).toBeGreaterThan(0);
  });

  it("has no duplicate slugs", () => {
    expect(duplicates(events.map((e) => e.slug as string))).toEqual([]);
  });

  it("gives every event a parseable date and a non-empty title", () => {
    const broken = events
      .filter(
        (e) =>
          !/^\d{4}-\d{2}-\d{2}$/.test(e.dateISO as string) ||
          !((e.day as number) >= 1) ||
          !MONTHS.includes(e.month as string) ||
          !(e.dayOfWeek as string) ||
          !(e.title as string),
      )
      .map((e) => `${e.slug}: ${e.dateISO} ${e.month} ${e.day}`);
    expect(broken).toEqual([]);
  });
});

describe("members.json", () => {
  it("has no duplicate chamberSlugs", () => {
    expect(duplicates(members.map((m) => m.chamberSlug))).toEqual([]);
  });
});

describe("hand-maintained slug tables track members.json", () => {
  it("has a member for every Community Investor slug", () => {
    expect([...COMMUNITY_INVESTOR_SLUGS].filter((s) => !memberSlugs.has(s))).toEqual([]);
  });

  it("has a member for every Visibility Plus slug", () => {
    expect([...VISIBILITY_PLUS_SLUGS].filter((s) => !memberSlugs.has(s))).toEqual([]);
  });

  it("never lists the same member in both paid tiers", () => {
    expect([...COMMUNITY_INVESTOR_SLUGS].filter((s) => VISIBILITY_PLUS_SLUGS.has(s))).toEqual([]);
  });

  it("has a member for every member-overrides slug", () => {
    // An override for a renamed slug applies to nobody, and the scraper
    // re-applies overrides on every run, so the enrichment just vanishes.
    expect(overrideSlugs.filter((s) => !memberSlugs.has(s))).toEqual([]);
  });
});

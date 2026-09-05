import { describe, expect, it } from "vitest";
import { COMMUNITY_INVESTOR_SLUGS, VISIBILITY_PLUS_SLUGS } from "./tier-overrides";
import { members } from "./members";

const slugs = new Set(members.map((m) => m.chamberSlug));

/**
 * The weekly GrowthZone scrape rewrites members.json, and a renamed business
 * changes its chamberSlug. When that happens the override set still holds the
 * old slug, the member silently drops to standard tier across the directory,
 * gz-sync's membership_tier column and ChamberBot prioritisation, and nothing
 * complains. Fail the build instead: re-run scripts/sync-tier-overrides.mjs.
 */
describe("tier overrides still resolve against members.json", () => {
  it("every Community Investor slug is a current member", () => {
    const orphans = [...COMMUNITY_INVESTOR_SLUGS].filter((s) => !slugs.has(s));
    expect(orphans).toEqual([]);
  });

  it("every Visibility Plus slug is a current member", () => {
    const orphans = [...VISIBILITY_PLUS_SLUGS].filter((s) => !slugs.has(s));
    expect(orphans).toEqual([]);
  });

  it("no member is listed in both tiers", () => {
    const both = [...COMMUNITY_INVESTOR_SLUGS].filter((s) => VISIBILITY_PLUS_SLUGS.has(s));
    expect(both).toEqual([]);
  });
});

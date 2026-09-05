/**
 * Guard: the chamber's three tier prices are written down TWICE, by hand.
 *
 *   1. src/lib/cms-store.ts  DEFAULT_PRICING  — dollars, drives every public
 *      page (/membership/pricing, the join flow, the chatbot's facts).
 *   2. scripts/membership-tier-seed-data.ts   — cents, seeds membership_tiers,
 *      which is what the portal's invoices and billing tables read.
 *
 * Nothing derives one from the other, so a price change applied to only one
 * side ships a site that quotes $345 on the marketing page and bills $395 in
 * the portal. That is the failure this file exists to catch. It is a drift
 * guard, not a unit test: it asserts the two copies agree, not that either
 * number is "right" (the source of truth for that is the chamber's brand docs).
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_PRICING } from "@/lib/cms-store";
import { tiers as seedTiers } from "../../scripts/membership-tier-seed-data";

/** DEFAULT_PRICING key → the membership_tiers slug gz-sync writes to orgs. */
const KEY_TO_SLUG: Record<string, string> = {
  essentials: "standard",
  plus: "visibility_plus",
  investor: "community_investor",
};

describe("DEFAULT_PRICING vs the membership_tiers seed", () => {
  it("covers the same three tiers", () => {
    expect(DEFAULT_PRICING.tiers.map((t) => t.key).sort()).toEqual(
      ["essentials", "investor", "plus"],
    );
    expect(seedTiers.map((t) => t.slug).sort()).toEqual(
      ["community_investor", "standard", "visibility_plus"],
    );
  });

  it.each(Object.entries(KEY_TO_SLUG))(
    "quotes the same price and name for %s",
    (key, slug) => {
      const cms = DEFAULT_PRICING.tiers.find((t) => t.key === key);
      const seed = seedTiers.find((t) => t.slug === slug);
      expect(cms, `no DEFAULT_PRICING tier keyed "${key}"`).toBeDefined();
      expect(seed, `no seed tier with slug "${slug}"`).toBeDefined();

      // The public page shows dollars; the DB stores cents.
      expect(seed!.annualPriceCents).toBe(cms!.price * 100);
      expect(seed!.name).toBe(cms!.name);
    },
  );

  it("keeps the seed's benefit lists cumulative across tiers", () => {
    // Within the seed only. A cross-source benefit comparison is not possible:
    // the two files word and group the same perks differently ("Online Directory
    // Listing" vs "Online directory listing"; 14 seed essentials vs 18 CMS ones),
    // so prices and names are the only comparable fields. What this DOES catch:
    // a tier that stops being a superset of the one below it, which is how an
    // upgrade comes to look like it drops benefits.
    const ordered = [...seedTiers].sort((a, b) => a.sortOrder - b.sortOrder);
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1].benefits;
      const curr = ordered[i].benefits;
      expect(
        curr.slice(0, prev.length),
        `${ordered[i].name} drops benefits that ${ordered[i - 1].name} has`,
      ).toEqual(prev);
      expect(curr.length).toBeGreaterThan(prev.length);
    }
  });

  it("gives every seeded tier a slug gz-sync can actually match", () => {
    // organizations.membership_tier is set by gz-sync from the GrowthZone
    // export. A seed slug that no org ever carries silently orphans that tier.
    expect(new Set(seedTiers.map((t) => t.slug))).toEqual(
      new Set(Object.values(KEY_TO_SLUG)),
    );
  });
});

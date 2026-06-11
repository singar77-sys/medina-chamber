/**
 * Membership tier helpers — DB-backed.
 *
 * The `membership_tiers` table is the single source of truth for tier names,
 * prices, and benefits. This module is what the public pricing page and
 * ChamberBot read; the admin pricing editor writes to Redis as an optional
 * override layer on top.
 *
 * Display metadata (who, cta, featured) is static marketing copy that doesn't
 * change with pricing updates, so it lives here rather than in the DB.
 */

import { db } from "@/lib/db";
import { membershipTiers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// ── Static display metadata keyed by slug ──────────────────────────────────────

const TIER_META: Record<string, { who: string; cta: string; featured?: boolean }> = {
  standard: {
    who: "Solopreneurs and small teams needing credibility, network access, and baseline marketing boosts.",
    cta: "Join Essentials",
  },
  visibility_plus: {
    who: "Growth-minded small and mid-sized businesses seeking more impressions and owned media slots.",
    cta: "Upgrade to Plus",
    featured: true,
  },
  community_investor: {
    who: "Established firms prioritizing policy access, high-profile recognition, and year-round VIP presence.",
    cta: "Become an Investor",
  },
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TierDisplay {
  key: string;              // slug: "standard" | "visibility_plus" | "community_investor"
  name: string;
  price: number;            // annual price in dollars (annualPriceCents / 100)
  tagline: string;          // short description for the pricing card
  who: string;              // "best for" blurb
  benefits: string[];       // full cumulative list for this tier
  addedBenefits?: string[]; // incremental additions vs the tier below (for card display)
  cta: string;
  featured?: boolean;
}

// ── Query ──────────────────────────────────────────────────────────────────────

export async function getActiveTiers(): Promise<TierDisplay[]> {
  let rows: (typeof membershipTiers.$inferSelect)[];
  try {
    rows = await db
      .select()
      .from(membershipTiers)
      .where(eq(membershipTiers.isActive, true))
      .orderBy(asc(membershipTiers.sortOrder));
  } catch (err) {
    console.error("[membership-tiers] getActiveTiers failed:", err);
    return [];
  }

  return rows.map((tier, i) => {
    const meta = TIER_META[tier.slug] ?? { who: "", cta: "Join" };
    const benefits = (tier.benefits as string[] | null) ?? [];

    // Compute incremental additions vs the previous tier for card display.
    // The DB stores cumulative lists, so we diff to get what each tier adds.
    const addedBenefits =
      i === 0
        ? undefined
        : (() => {
            const prev = (rows[i - 1].benefits as string[] | null) ?? [];
            const prevSet = new Set(prev);
            const added = benefits.filter((b) => !prevSet.has(b));
            return added.length > 0 ? added : undefined;
          })();

    return {
      key: tier.slug,
      name: tier.name,
      price: Math.round(tier.annualPriceCents / 100),
      tagline: tier.description ?? "",
      who: meta.who,
      benefits,
      addedBenefits,
      cta: meta.cta,
      featured: meta.featured,
    };
  });
}

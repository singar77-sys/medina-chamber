/**
 * Membership tier helpers — DB-backed.
 *
 * Scope is narrow on purpose: the `membership_tiers` table drives campaign
 * segmentation in the admin (the audience pickers read key + name). The PUBLIC
 * pricing page, benefits page and ChamberBot all read getCmsPricing() /
 * DEFAULT_PRICING from src/lib/cms-store.ts, which is the single source of
 * truth for the published $345 / $575 / $1,145 tier copy. Do not add public
 * pricing or marketing fields here: two sources for the same numbers is how a
 * price change lands in only one of them.
 */

import { db } from "@/lib/db";
import { membershipTiers } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export interface TierDisplay {
  key: string;   // slug: "standard" | "visibility_plus" | "community_investor"
  name: string;
  price: number; // annual price in dollars (annualPriceCents / 100)
}

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

  return rows.map((tier) => ({
    key: tier.slug,
    name: tier.name,
    price: Math.round(tier.annualPriceCents / 100),
  }));
}

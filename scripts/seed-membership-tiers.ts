/**
 * Seed the membership_tiers table with the three canonical chamber tiers.
 *
 * Slugs match the values written to organizations.membership_tier by gz-sync,
 * so existing org records are automatically linked once tiers are seeded.
 *
 * Idempotent — safe to re-run; updates name/price/benefits on conflict.
 *
 *   pnpm tsx --env-file=.env.local scripts/seed-membership-tiers.ts
 */

import { db } from "@/lib/db";
import { membershipTiers } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

import { tiers } from "./membership-tier-seed-data";

// ── Seed ───────────────────────────────────────────────────────────────────────

void (async () => {
  console.log("🌱  Seeding membership_tiers...\n");

  for (const tier of tiers) {
    await db
      .insert(membershipTiers)
      .values({ ...tier, isActive: true })
      .onConflictDoUpdate({
        target: membershipTiers.slug,
        set: {
          name:              sql`excluded.name`,
          description:       sql`excluded.description`,
          annualPriceCents:  sql`excluded.annual_price_cents`,
          monthlyPriceCents: sql`excluded.monthly_price_cents`,
          benefits:          sql`excluded.benefits`,
          sortOrder:         sql`excluded.sort_order`,
          updatedAt:         sql`now()`,
        },
      });

    console.log(`  ✅  ${tier.name} ($${(tier.annualPriceCents / 100).toFixed(0)}/yr) — slug: ${tier.slug}`);
  }

  console.log("\n🎉  Done.");
  process.exit(0);
})();

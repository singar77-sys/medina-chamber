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

// ── Benefits ───────────────────────────────────────────────────────────────────

const essentials = [
  "Online directory listing",
  "Ribbon cutting ceremony",
  "Member mailing address list",
  "Post sharing on Chamber socials",
  "Business advocacy & economic development support",
  "Access to coworking space",
  "Member Portal account",
  "Custom digital membership badge",
  "Free job postings",
  "Share company announcements in Member Portal",
  "Referral network access",
  "Personalized onboarding with Chamber staff",
  "Free notary service",
  "Group health insurance (2–49 employees)",
  "20% discount at Medina Recreation Center",
  "Workers' compensation program",
  "Member-only event pricing",
];

const plusAdded = [
  "Directory listing enhanced with logo",
  "Member spotlight (social & email)",
  "Custom digital membership sticker video",
  "E-newsletter ad placement (4 per year)",
  "Free certificate of origin (non-freight forwarders)",
];

const investorAdded = [
  "Investor member spotlight (social, email, & website)",
  "2 free tickets to monthly luncheons",
  "Access to local & state legislator events & introductions",
  "Recognition at all events as Investor",
];

// ── Tiers ──────────────────────────────────────────────────────────────────────

const tiers = [
  {
    name: "Business Essentials",
    slug: "standard",           // matches organizations.membership_tier from gz-sync
    description:
      "Everything you need to plug into the Medina business community — visibility, advocacy, and member pricing at a starter-friendly rate.",
    annualPriceCents: 34500,    // $345
    monthlyPriceCents: null,
    benefits: essentials,
    sortOrder: 0,
  },
  {
    name: "Visibility Plus",
    slug: "visibility_plus",    // matches organizations.membership_tier from gz-sync
    description:
      "Turn up your reach with logo-enhanced directory, member spotlights, and four newsletter ads per year — done-for-you visibility.",
    annualPriceCents: 57500,    // $575
    monthlyPriceCents: null,
    benefits: [...essentials, ...plusAdded],
    sortOrder: 1,
  },
  {
    name: "Community Investor",
    slug: "community_investor", // matches organizations.membership_tier from gz-sync
    description:
      "Lead from the front: VIP spotlights, two luncheon tickets monthly, and direct access to legislator events with recognition at every Chamber event.",
    annualPriceCents: 114500,   // $1,145
    monthlyPriceCents: null,
    benefits: [...essentials, ...plusAdded, ...investorAdded],
    sortOrder: 2,
  },
];

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

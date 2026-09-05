/**
 * Canonical membership tier seed data — the three chamber tiers as they are
 * written to the `membership_tiers` table.
 *
 * Split out of scripts/seed-membership-tiers.ts so it can be imported without
 * pulling in `@/lib/db` (that module's top-level IIFE would run a live seed).
 * src/lib/pricing-consistency.test.ts asserts this stays in step with
 * DEFAULT_PRICING in src/lib/cms-store.ts — the two are separate hand-maintained
 * copies of the same prices, and a drift between them means the public pricing
 * page and the billing tables quote different numbers.
 */

// ── Benefits ───────────────────────────────────────────────────────────────────

const essentials = [
  "Online Directory Listing",
  "Share Member News",
  "Member Mailing Address List",
  "Post Sharing on Chamber Socials",
  "Referral Network Access",
  "Info Hub Member Portal Access",
  "Monthly Complimentary Networking Events",
  "Member-Only Pricing on Chamber Events",
  "Post Jobs on Chamber Website",
  "Personalized Onboarding",
  "Subscription to Quarterly Magazine",
  "Advertising & Sponsorship Opportunities",
  "Complimentary Notary Service",
  "Savings Programs (Health Insurance, Rec Center, Energy Discounts, etc.)",
];

const plusAdded = [
  "E-Newsletter Ad Placement (4/year)",
  "Free Certificate of Origin (Non-Freight Forwarders Only)",
  "Enhanced Online Directory Listing",
  "Custom Digital Membership Sticker Video",
];

const investorAdded = [
  "Exclusive Special Events Invitations",
  "Investor Member Spotlight (Social, Email, & Website)",
  "Anytime Access to Member Mailing List",
  "2 Complimentary Tickets to Member Luncheons",
];

// ── Tiers ──────────────────────────────────────────────────────────────────────

export const tiers = [
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

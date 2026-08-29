/**
 * Redis-backed CMS override store.
 *
 * All admin mutations go through typed helpers here. Pages read Redis
 * first and fall back to their static JSON data — so the store is purely
 * additive: nothing breaks if Redis is unavailable or a key is missing.
 *
 * Key namespaces:
 *   cms:event-info:{slug}       EventInfo override for graphic templates
 *   cms:content:{page}:{field}  Per-page editable text fields
 *   cms:blog:post:{slug}        CMS-authored blog posts (full object)
 *   cms:blog:index              JSON string[] of CMS blog slugs (newest first)
 *
 * TTL: 1 year for all keys — they're managed explicitly via admin UI.
 */

import { cache } from "react";
import { getRedis } from "@/lib/upstash";
import type { EventInfo } from "@/components/events/graphics/shared";

const TTL = 365 * 24 * 3600; // seconds

/** Read-side guard. The store's contract is "purely additive — nothing breaks
 *  if Redis is unavailable", which must cover thrown network errors, not just
 *  the unconfigured-null case: a Redis outage must degrade to static data, not
 *  500 the pricing/event/blog pages. Write helpers still throw so admin saves
 *  fail loudly. */
async function readSafe<T>(label: string, op: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await op();
  } catch (err) {
    console.error(`[cms-store] Redis read failed (${label}):`, err);
    return fallback;
  }
}

// ── Event graphic overrides ────────────────────────────────────────────────

export async function getEventInfoOverride(slug: string): Promise<EventInfo | null> {
  const redis = getRedis();
  if (!redis) return null;
  return readSafe("event-info", () => redis.get<EventInfo>(`cms:event-info:${slug}`), null);
}

export async function setEventInfoOverride(slug: string, info: EventInfo): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  await redis.set(`cms:event-info:${slug}`, info, { ex: TTL });
}

export async function clearEventInfoOverride(slug: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`cms:event-info:${slug}`);
}

// ── Page content overrides ─────────────────────────────────────────────────

export async function getContentField(page: string, field: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return readSafe("content", () => redis.get<string>(`cms:content:${page}:${field}`), null);
}

export async function setContentField(
  page: string,
  field: string,
  value: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  await redis.set(`cms:content:${page}:${field}`, value, { ex: TTL });
}

export async function clearContentField(page: string, field: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`cms:content:${page}:${field}`);
}

// ── CMS blog posts ─────────────────────────────────────────────────────────

export interface CmsBlogPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  dateISO: string;
  image: string;
  createdAt: string;
  updatedAt: string;
}

/** cache() dedupes the generateMetadata + page-body reads within one request. */
export const getCmsBlogPost = cache(async (slug: string): Promise<CmsBlogPost | null> => {
  const redis = getRedis();
  if (!redis) return null;
  return readSafe("blog-post", () => redis.get<CmsBlogPost>(`cms:blog:post:${slug}`), null);
});

export async function saveCmsBlogPost(post: CmsBlogPost): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");

  await redis.set(`cms:blog:post:${post.slug}`, post, { ex: TTL });

  const slugs = (await redis.get<string[]>("cms:blog:index")) ?? [];
  if (!slugs.includes(post.slug)) {
    await redis.set("cms:blog:index", [post.slug, ...slugs], { ex: TTL });
  }
}

export async function deleteCmsBlogPost(slug: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.del(`cms:blog:post:${slug}`);
  const slugs = (await redis.get<string[]>("cms:blog:index")) ?? [];
  await redis.set(
    "cms:blog:index",
    slugs.filter((s) => s !== slug),
    { ex: TTL },
  );
}

export async function listCmsBlogPosts(): Promise<CmsBlogPost[]> {
  const redis = getRedis();
  if (!redis) return [];

  return readSafe(
    "blog-index",
    async () => {
      const slugs = (await redis.get<string[]>("cms:blog:index")) ?? [];
      const posts = await Promise.all(slugs.map((s) => getCmsBlogPost(s)));
      return posts.filter((p): p is CmsBlogPost => p !== null);
    },
    [],
  );
}

// ── CMS event data overrides ───────────────────────────────────────────────

/** Editable fields for a scraped ChamberEvent. All optional — only the
 *  fields that differ from the scraped data need to be stored. */
export interface CmsEventData {
  title?: string;
  dateISO?: string;
  dayOfWeek?: string;
  month?: string;
  day?: number;
  year?: number;
  startTime?: string;
  endTime?: string;
  dateString?: string;
  location?: string;
  locationDesc?: string;
  venue?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  pricing?: string;
  registerUrl?: string;
  contactName?: string;
  contactPhone?: string;
  updatedAt?: string;
}

/** cache() dedupes the generateMetadata + page-body reads within one request. */
export const getCmsEventData = cache(async (slug: string): Promise<CmsEventData | null> => {
  const redis = getRedis();
  if (!redis) return null;
  return readSafe("event-data", () => redis.get<CmsEventData>(`cms:event:${slug}`), null);
});

export async function setCmsEventData(slug: string, data: CmsEventData): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  await redis.set(`cms:event:${slug}`, { ...data, updatedAt: new Date().toISOString() }, { ex: TTL });
}

export async function clearCmsEventData(slug: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`cms:event:${slug}`);
}

// ── Membership pricing ─────────────────────────────────────────────────────
// Single source of truth for membership tier data. The pricing page reads
// from here; ChamberBot reads the same data for its system prompt facts block.
// One write → both surfaces stay in sync automatically.

export interface PricingTier {
  key: string;              // "essentials" | "plus" | "investor"
  name: string;
  price: number;
  tagline: string;
  who: string;
  benefits: string[];       // base benefits for this tier
  addedBenefits?: string[]; // benefits added on top of the tier below
  cta: string;
  featured?: boolean;       // whether to highlight as "Most Popular"
}

export interface PricingFaq {
  q: string;
  a: string;
}

export interface PricingConfig {
  tiers: PricingTier[];
  faqs: PricingFaq[];
  updatedAt?: string;
}

// Static defaults — used as fallback when no CMS override exists.
// The pricing page and bot both use these if Redis has nothing stored.
const _essentialsBenefits = [
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
const _plusAdded = [
  "Directory listing enhanced with logo",
  "Member spotlight (social & email)",
  "Custom digital membership sticker video",
  "E-newsletter ad placement (4 per year)",
  "Free certificate of origin (non-freight forwarders)",
];
const _investorAdded = [
  "Investor member spotlight (social, email, & website)",
  "2 free tickets to member luncheons",
  "Access to local & state legislator events & introductions",
  "Recognition at all events as Investor",
];

export const DEFAULT_PRICING: Omit<PricingConfig, "updatedAt"> = {
  tiers: [
    {
      key: "essentials",
      name: "Business Essentials",
      price: 345,
      tagline:
        "Everything you need to plug into the Medina business community, visibility, advocacy, and member pricing, at a starter-friendly rate.",
      who: "Solopreneurs and small teams needing credibility, network access, and baseline marketing boosts.",
      benefits: _essentialsBenefits,
      cta: "Join Essentials",
    },
    {
      key: "plus",
      name: "Visibility Plus",
      price: 575,
      tagline:
        "Turn up your reach with logo-enhanced directory, member spotlights, and four newsletter ads per year, done-for-you visibility.",
      who: "Growth-minded small and mid-sized businesses seeking more impressions and owned media slots.",
      benefits: _essentialsBenefits,
      addedBenefits: _plusAdded,
      cta: "Upgrade to Plus",
      featured: true,
    },
    {
      key: "investor",
      name: "Community Investor",
      price: 1145,
      tagline:
        "Lead from the front: VIP spotlights, complimentary luncheon tickets, and direct access to legislator events, with recognition at every Chamber event.",
      who: "Established firms prioritizing policy access, high-profile recognition, and year-round VIP presence.",
      benefits: [..._essentialsBenefits, ..._plusAdded],
      addedBenefits: _investorAdded,
      cta: "Become an Investor",
    },
  ],
  faqs: [
    {
      q: "Do I qualify for group health insurance?",
      a: "Available for employers with 2–49 employees. Details provided during onboarding.",
    },
    {
      q: "What's included in member spotlights?",
      a: "Visibility Plus spotlights run on social and email. Community Investor spotlights run on social, email, and the chamber website.",
    },
    {
      q: "Do Investors get ongoing event perks?",
      a: "Yes, complimentary luncheon tickets plus recognition at all events.",
    },
    {
      q: "What's the Certificate of Origin benefit?",
      a: "Free for non-freight forwarders on Visibility Plus and Community Investor tiers.",
    },
    {
      q: "How do I upgrade later?",
      a: "Contact Stephanie Mueller at any time.",
    },
  ],
};

export async function getCmsPricing(): Promise<PricingConfig | null> {
  const redis = getRedis();
  if (!redis) return null;
  return readSafe("pricing", () => redis.get<PricingConfig>("cms:pricing"), null);
}

export async function setCmsPricing(config: PricingConfig): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");
  await redis.set(
    "cms:pricing",
    { ...config, updatedAt: new Date().toISOString() },
    { ex: TTL },
  );
}

export async function clearCmsPricing(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del("cms:pricing");
}

// ── Content field definitions ──────────────────────────────────────────────
// Defines which fields are editable per page. Used by the admin content
// editor to render the right form and enforce character limits.

export interface ContentFieldDef {
  page: string;
  field: string;
  label: string;
  type: "text" | "textarea";
  maxLength: number;
  defaultValue: string;
  hint?: string;
}

// Every field maps to a REAL text node on a public page (wired through
// src/lib/cms-content.ts) and its defaultValue mirrors that page's shipped
// copy verbatim. Fields that used to exist here with no rendered home (the
// composed home/about headlines, an unrendered mission statement) were
// removed 2026-08-29 — the editor must never offer a control that does
// nothing. Add a field only together with its page wiring.
export const CONTENT_FIELD_DEFS: ContentFieldDef[] = [
  // Home page
  {
    page: "home",
    field: "hero-headline",
    label: "Hero Eyebrow",
    type: "text",
    maxLength: 80,
    defaultValue: "Greater Medina Chamber of Commerce",
    hint: "Small line above “Medina Means Business” in the homepage hero (the big headline itself is fixed brand art)",
  },
  {
    page: "home",
    field: "hero-subheadline",
    label: "Hero Subheadline",
    type: "textarea",
    maxLength: 200,
    defaultValue:
      "Championing Medina's business community since 1938. Advocacy that moves policy. Connections that open doors. Resources that drive growth.",
    hint: "Paragraph below the homepage hero headline",
  },
  // Membership pricing page
  {
    page: "membership",
    field: "intro-body",
    label: "Pricing Page Intro",
    type: "textarea",
    maxLength: 400,
    defaultValue:
      "Pick the tier that fits your goals, from first-year essentials to investor-level access and recognition. Every membership includes the full Chamber network and savings programs.",
    hint: "Paragraph under “Three Tiers. One Community.” on /membership/pricing",
  },
  // Events page
  {
    page: "events",
    field: "intro-headline",
    label: "Upcoming Events Heading",
    type: "text",
    maxLength: 80,
    defaultValue: "Upcoming Events",
    hint: "Section heading above the events timeline on /events",
  },
  // Contact page
  {
    page: "contact",
    field: "hours",
    label: "Office Hours",
    type: "text",
    maxLength: 100,
    defaultValue: "Mon–Fri · 10:00 AM – 4:00 PM",
    hint: "Shown under the address on the contact page (search-engine structured hours are set separately in code)",
  },
];

import type { MetadataRoute } from "next";
import { members } from "@/data/members";
import { activeCommunities } from "@/data/communities";
import { jobs } from "@/data/jobs";
import { events } from "@/data/events";
import { getAllBlogPosts } from "@/lib/cms-blog";
import { memberNewsArticles } from "@/data/member-news";

const BASE_URL = "https://medinachamber.com";

// Regenerate hourly — the CMS blog lookup shouldn't make every crawler
// request hit Redis.
export const revalidate = 3600;

/**
 * Parse a record's publish date (YYYY-MM-DD, may carry a time suffix) into a
 * Date for <lastmod>. Returns undefined when there's no usable date so the
 * URL is emitted without a fake `lastModified` — omitting is valid per the
 * sitemap spec and honest, unlike stamping every URL with the build time.
 */
function parseRecordDate(dateISO: string | undefined): Date | undefined {
  if (!dateISO) return undefined;
  const d = new Date(dateISO.length === 10 ? `${dateISO}T00:00:00Z` : dateISO);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static marketing/legal pages. No per-record modification signal exists,
  // so `lastModified` is intentionally omitted rather than faked with the
  // build time — priority + changeFrequency still guide crawl scheduling.
  const staticPages: MetadataRoute.Sitemap = [
    // Core
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/membership/directory`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/membership/join`, changeFrequency: "monthly", priority: 0.8 },
    // Events
    { url: `${BASE_URL}/events`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/events/sponsorships`, changeFrequency: "monthly", priority: 0.6 },
    // Programs
    { url: `${BASE_URL}/programs`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/programs/compass`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/golf-outing`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/programs/athena-awards`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/social-connect`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/safety-council`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/rental-space`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/programs/italy-trip`, changeFrequency: "monthly", priority: 0.7 },
    // Membership
    { url: `${BASE_URL}/membership/benefits`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/membership/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/membership/committees`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/membership/community-investor`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/membership/savings`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/membership/first-30-days`, changeFrequency: "monthly", priority: 0.7 },
    // About
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about/board`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about/ambassadors`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/about/advocacy`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about/hall-of-fame`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/about/contact`, changeFrequency: "monthly", priority: 0.6 },
    // News (listing hubs)
    { url: `${BASE_URL}/news`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/news/member-news`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/news/magazine`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/news/blog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/news/podcast`, changeFrequency: "weekly", priority: 0.5 },
    // Jobs
    { url: `${BASE_URL}/jobs`, changeFrequency: "weekly", priority: 0.7 },
    // Communities
    { url: `${BASE_URL}/community`, changeFrequency: "monthly", priority: 0.7 },
    // Brand landing page
    { url: `${BASE_URL}/medina-means-business`, changeFrequency: "monthly", priority: 0.8 },
    // Resources
    { url: `${BASE_URL}/resources`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/resources/start-a-business`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/business-grants`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/workforce`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/library`, changeFrequency: "weekly", priority: 0.6 },
    // ChamberBot — dedicated immersive AI experience
    { url: `${BASE_URL}/chamberbot`, changeFrequency: "monthly", priority: 0.7 },
    // Policy / legal
    { url: `${BASE_URL}/accessibility`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic detail pages — `lastModified` reflects each record's own publish
  // date (dateISO), not the build time, so a re-deploy doesn't tell crawlers
  // every page changed. Member directory entries carry no date field, so
  // theirs is omitted.
  const memberPages: MetadataRoute.Sitemap = members.map((m) => ({
    url: `${BASE_URL}/membership/directory/${m.chamberSlug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const communityPages: MetadataRoute.Sitemap = activeCommunities.map((c) => ({
    url: `${BASE_URL}/community/${c.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const eventPages: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${BASE_URL}/events/${e.slug}`,
    lastModified: parseRecordDate(e.dateISO),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // CMS-authored posts merged with the scraped archive (CMS wins on slug).
  const blogPages: MetadataRoute.Sitemap = (await getAllBlogPosts()).map((p) => ({
    url: `${BASE_URL}/news/blog/${p.slug}`,
    lastModified: parseRecordDate(p.dateISO),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const memberNewsPages: MetadataRoute.Sitemap = memberNewsArticles.map((a) => ({
    url: `${BASE_URL}/news/member-news/${a.slug}`,
    lastModified: parseRecordDate(a.dateISO),
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const jobPages: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${BASE_URL}/jobs/${j.slug}`,
    lastModified: parseRecordDate(j.dateISO),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...communityPages,
    ...eventPages,
    ...blogPages,
    ...memberNewsPages,
    ...jobPages,
    ...memberPages,
  ];
}

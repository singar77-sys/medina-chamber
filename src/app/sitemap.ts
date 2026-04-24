import type { MetadataRoute } from "next";
import { members } from "@/data/members";
import { activeCommunities } from "@/data/communities";
import { jobs } from "@/data/jobs";

const BASE_URL = "https://medinachamber.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    // Core
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/membership/directory`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/membership/join`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // Events
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/events/sponsorships`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    // Programs
    { url: `${BASE_URL}/programs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/programs/compass`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/golf-outing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/programs/athena-awards`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/social-connect`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/safety-council`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/programs/rental-space`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    // Membership
    { url: `${BASE_URL}/membership/benefits`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/membership/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/membership/committees`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/membership/savings`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/membership/first-30-days`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    // About
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about/board`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about/ambassadors`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/about/advocacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about/hall-of-fame`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/about/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    // News
    { url: `${BASE_URL}/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/news/member-news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/news/magazine`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/news/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    // Jobs
    { url: `${BASE_URL}/jobs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    // Communities
    { url: `${BASE_URL}/community`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    // Brand landing page
    { url: `${BASE_URL}/medina-means-business`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // Resources
    { url: `${BASE_URL}/resources`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/resources/start-a-business`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/business-grants`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/resources/workforce`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // ChamberBot — dedicated immersive AI experience
    { url: `${BASE_URL}/chamberbot`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    // Policy / legal
    { url: `${BASE_URL}/accessibility`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  const memberPages: MetadataRoute.Sitemap = members.map((m) => ({
    url: `${BASE_URL}/membership/directory/${m.chamberSlug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const communityPages: MetadataRoute.Sitemap = activeCommunities.map((c) => ({
    url: `${BASE_URL}/community/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const jobPages: MetadataRoute.Sitemap = jobs.map((j) => ({
    url: `${BASE_URL}/jobs/${j.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...communityPages, ...jobPages, ...memberPages];
}

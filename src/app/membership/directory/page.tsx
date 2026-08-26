import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDirectoryMembers, topIndustries } from "@/lib/directory";
import { members as staticMembers } from "@/data/members";
import { memberLogo } from "@/lib/member-logos";
import { normalizeCategories } from "@/lib/categories";
import { DirectoryClient } from "./DirectoryClient";
import { CommunityInvestors } from "@/components/CommunityInvestors";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import {
  BENEFITS_VIDEO,
  BENEFITS_VIDEO_POSTER,
  benefitsWheelVideoJsonLd,
} from "@/lib/benefits-wheel-video";

export const metadata: Metadata = {
  title: "Member Directory",
  description:
    "Find local businesses in Medina County. Search Greater Medina Chamber of Commerce member businesses by name, service, industry, or city.",
  openGraph: {
    title: "Member Directory | Greater Medina Chamber of Commerce",
    description:
      "Find local businesses in Medina County. Search Chamber member businesses by name, service, industry, or city.",
  },
  alternates: { canonical: "/membership/directory" },
};

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  let members: Awaited<ReturnType<typeof getDirectoryMembers>> = [];
  try {
    members = await getDirectoryMembers(db);
  } catch (err) {
    console.error("[directory] load failed:", err);
  }
  // Resilience: the DB is the only runtime dependency of this public page.
  // If it's unreachable (bad prod DATABASE_URL, enforced SSL, IP allowlist)
  // or returns nothing, fall back to the bundled static roster so the
  // directory degrades to a full, styled page instead of rendering empty.
  if (members.length === 0) {
    console.warn("[directory] DB returned no members — using static roster fallback");
    members = staticMembers;
  }
  // Overlay the curated logos (public/images/members/logos/) onto members — the
  // DB logoUrl column doesn't carry them, and MemberCard shows the logo header
  // for Community Investors that have one — and normalize categories so
  // near-duplicate GrowthZone labels collapse into one browse chip (also covers
  // the static-roster fallback path above).
  members = members.map((m) => {
    const logo = memberLogo(m.chamberSlug);
    return { ...m, categories: normalizeCategories(m.categories), ...(logo ? { logoUrl: logo } : {}) };
  });
  // Full count-sorted category list; the client shows the top 10 until
  // the visitor expands to all categories.
  const industries = topIndustries(members);

  // The full A–Z member dump was removed — the searchable grid above plus
  // sitemap.ts cover browsing and crawl indexing respectively.
  return (
    <>
      <DirectoryClient members={members} industries={industries} />

      {/* Membership at a glance — ambient benefits-wheel loop over the
          perspective-honeycomb brand abstract (Mark 2026-08-26). The ghost
          is a DARK image (teal glow on near-black), so it runs hotter than
          a photo ghost in dark mode and cooler in light, where its black
          field would gray out the band. Muted + playsInline so autoplay is
          allowed everywhere; poster keeps the LCP honest. */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/backgrounds/brand-honeycomb-perspective.webp"
            alt=""
            fill
            className="object-cover opacity-[0.32] [[data-theme=light]_&]:opacity-[0.12]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(benefitsWheelVideoJsonLd) }}
        />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Membership</p>
                <h2 className="text-h2">Five pillars, one membership.</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Every business in this directory taps the same engine —
                  connections, visibility, advocacy, savings, and education.
                </p>
                <Link
                  href="/membership/benefits"
                  className="inline-block mt-f21 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  See every benefit →
                </Link>
              </div>
              <video
                className="w-full aspect-video rounded-[var(--radius-lg)] border border-border-secondary bg-bg-secondary object-cover"
                src={BENEFITS_VIDEO}
                poster={BENEFITS_VIDEO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                aria-label="Animated wheel of the five Greater Medina Chamber membership benefits: connections, visibility, advocacy, savings, and education"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Community Investor logo marquee — same strip as the homepage, plain
          (no backdrop) so the photo bands alternate around it */}
      <CommunityInvestors />

      {/* Join CTA — clock-medina ghosted as the section background */}
      <section className="relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted Medina town-clock backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/clock-medina.jpg"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl">
              <h2 className="text-h2">Want your business in the directory?</h2>
              <p className="text-body-lg text-text-secondary mt-f13">
                Chamber members are automatically listed with their full business
                profile, name, address, website, categories, and description.
                It&apos;s one of the most visible benefits of membership.
              </p>
              <div className="mt-f21 flex flex-wrap gap-f13">
                <Link
                  href="/membership/join"
                  className="
                    inline-flex items-center px-f21 py-f13
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                    transition-colors duration-200
                  "
                >
                  Join the Chamber <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    inline-flex items-center px-f21 py-f13
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                    transition-colors duration-200
                  "
                >
                  See All Benefits
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

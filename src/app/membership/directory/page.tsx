import type { Metadata } from "next";
import Link from "next/link";
import { members, totalCount, isVisibilityPlus } from "@/data/members";
import { MemberCard } from "@/components/MemberCard";

export const metadata: Metadata = {
  title: "Featured Members",
  description: `Meet the ${members.filter(isVisibilityPlus).length} Visibility Plus members of the Greater Medina Chamber of Commerce. Browse all ${totalCount}+ Chamber businesses in the full directory.`,
  openGraph: {
    title: "Featured Members — Greater Medina Chamber of Commerce",
    description:
      "Meet the Chamber's Visibility Plus members — the businesses that lead with premium placement in Medina County.",
  },
  alternates: { canonical: "/membership/directory" },
};

export default function DirectoryPage() {
  const visibilityPlus = members
    .filter(isVisibilityPlus)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* ── Hero ── */}
      <section className="max-w-3xl mb-14">
        <p className="text-overline text-cambridge mb-4">Featured Members</p>
        <h1 className="text-display leading-none">
          The Chamber&apos;s
          <br />
          <span className="text-accent">Visibility Plus</span>
          <br />
          members.
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl leading-relaxed">
          These{" "}
          <span className="font-bold text-text-primary">
            {visibilityPlus.length} businesses
          </span>{" "}
          have chosen premium visibility with the Greater Medina Chamber of
          Commerce — with extended profiles, priority placement, and prominent
          logo treatment across Chamber channels.
        </p>

        {/* Action row — Browse all + Upgrade */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/membership/directory/all"
            className="
              inline-flex items-center gap-2 px-6 py-3
              bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary
              hover:bg-oxford/85 [[data-theme=dark]_&]:hover:bg-bg-primary
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Browse all {totalCount}+ members
            <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/membership/pricing"
            className="
              inline-flex items-center gap-2 px-6 py-3
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Get Visibility Plus
          </Link>
        </div>
      </section>

      {/* ── Visibility Plus Grid ── */}
      <section>
        <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <svg
              className="w-4 h-4 text-amber-500 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
            </svg>
            <p className="text-caption text-text-tertiary font-bold uppercase tracking-wider">
              {visibilityPlus.length} Visibility Plus members
            </p>
          </div>
          <p className="text-caption text-text-tertiary">
            Looking for a specific business?{" "}
            <Link
              href="/membership/directory/all"
              className="text-cambridge font-bold hover:text-cambridge/80 transition-colors"
            >
              Search all {totalCount}+ →
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibilityPlus.map((member) => (
            <MemberCard key={member.chamberSlug} member={member} />
          ))}
        </div>
      </section>

      {/* ── View All CTA band ── */}
      <section className="mt-20 p-8 lg:p-12 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="text-overline text-cambridge mb-2">The full list</p>
            <h2 className="text-h3">
              Search all {totalCount}+ Chamber member businesses.
            </h2>
            <p className="text-body-sm text-text-secondary mt-3 max-w-xl">
              Every Chamber member is listed — searchable by name, category,
              or plain-English description. Ask Jackie-style: &ldquo;who does
              commercial HVAC in Brunswick?&rdquo;
            </p>
          </div>
          <Link
            href="/membership/directory/all"
            className="
              inline-flex items-center gap-2 px-6 py-3
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
              justify-self-start lg:justify-self-end
            "
          >
            Browse all members →
          </Link>
        </div>
      </section>

      {/* ── Upsell CTA ── */}
      <section className="mt-10 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want your business featured here?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Visibility Plus members get priority placement on this page,
            extended profiles, logo treatment, and the most prominent
            directory presence of any Chamber tier. Ask Stephanie — she&apos;ll
            walk you through how it works.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/membership/pricing"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See Visibility Plus pricing →
            </Link>
            <a
              href="mailto:stephanie@medinaohchamber.com?subject=Visibility%20Plus%20question"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Email Stephanie
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

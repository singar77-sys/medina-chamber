"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { IndustryChipStrip } from "./IndustryChipStrip";
import { getMembersByCity, getCommunityInvestors } from "@/data/members";

const FEATURED_CITIES = ["Medina", "Brunswick", "Wadsworth", "Lodi"] as const;

interface BrowseBandProps {
  /** Full category list sorted by member count (descending). */
  industries: ReadonlyArray<{ category: string; count: number }>;
  /** Industries currently shown (top slice or full list). */
  visibleIndustries: ReadonlyArray<{ category: string; count: number }>;
  /** Total member count (for the CTA label). */
  memberCount: number;
  /** Currently active category (null if none). */
  active: string | null;
  /** Called when an industry chip is clicked. */
  onSelect: (category: string | null) => void;
  /** Switches the directory into the all-members results view. */
  onSeeAll: () => void;
  /** Whether the full category list is shown. */
  expanded: boolean;
  /** Toggles between top industries and the full category list. */
  onToggleExpand: () => void;
}

/**
 * BrowseBand — the directory's browse moment as a single oxford-navy
 * band: industries (golden-ratio major column) and communities (minor
 * column) over a ghosted aerial of Medina Square, footed by a slim
 * Community Investor ribbon. Replaces the old three stacked sections
 * (homepage investors grid + chip strip + city cards).
 */
export function BrowseBand({
  industries,
  visibleIndustries,
  memberCount,
  active,
  onSelect,
  onSeeAll,
  expanded,
  onToggleExpand,
}: BrowseBandProps) {
  const cities = FEATURED_CITIES.map((city) => ({
    city,
    slug: city.toLowerCase(),
    total: getMembersByCity(city).length,
  })).filter((c) => c.total > 0);

  const investorCount = getCommunityInvestors().length;

  return (
    <section
      aria-labelledby="browse-band-heading"
      className="relative bg-oxford border-y border-white/10 py-f55 lg:py-f89 overflow-hidden"
    >
      {/* Ghosted Medina Square aerial backdrop */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <Image
          src="/images/photos/medina-square-aerial-spring.jpg"
          alt=""
          fill
          className="object-cover object-center opacity-[0.10]"
          sizes="100vw"
          quality={55}
        />
        {/* Bottom wash keeps the investor ribbon legible */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-oxford to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-overline text-cambridge mb-f8 tracking-[0.18em]">
          Browse the directory
        </p>
        <h2 id="browse-band-heading" className="text-h2 text-white">
          Every trade. <span className="text-cambridge">Every town.</span>
        </h2>
        <p className="text-body-lg text-white/70 mt-f8 max-w-2xl">
          {memberCount} member businesses across Medina County — browse by
          what you need or where you are.
        </p>

        {/* Golden ratio: industries (major) : communities (minor) */}
        <div className="mt-f34 grid gap-f34 lg:gap-f55 lg:grid-cols-[1.618fr_1fr] items-start">
          {/* ── By industry ── */}
          <div>
            <div className="flex items-baseline justify-between mb-f13">
              <h3 className="text-caption uppercase tracking-[0.18em] font-bold text-white/60">
                By industry
              </h3>
              <button
                type="button"
                onClick={onToggleExpand}
                aria-expanded={expanded}
                className="
                  text-caption text-white/60 hover:text-cambridge
                  underline underline-offset-4 transition-colors duration-200
                  focus-visible:outline-none focus-visible:text-cambridge
                "
              >
                {expanded ? (
                  "Show top industries"
                ) : (
                  <>
                    All {industries.length} categories{" "}
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>

            <IndustryChipStrip
              industries={visibleIndustries}
              totalCount={industries.length}
              active={active}
              onSelect={onSelect}
              variant="refine"
              appearance="dark"
              expanded={expanded}
            />

            <div className="mt-f21">
              <Button variant="primary" size="md" onClick={onSeeAll}>
                Browse all {memberCount} members{" "}
                <span aria-hidden="true" className="ml-f5">
                  →
                </span>
              </Button>
            </div>
          </div>

          {/* ── By community ── */}
          <div>
            <div className="flex items-baseline justify-between mb-f13">
              <h3 className="text-caption uppercase tracking-[0.18em] font-bold text-white/60">
                By community
              </h3>
              <Link
                href="/community"
                className="
                  text-caption text-white/60 hover:text-cambridge
                  underline underline-offset-4 transition-colors duration-200
                "
              >
                See all <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ul>
              {cities.map(({ city, slug, total }) => (
                <li key={city}>
                  <Link
                    href={`/community/${slug}`}
                    className="
                      group flex items-baseline gap-f13
                      py-f13 border-b border-white/10
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:rounded
                    "
                  >
                    <span
                      className="text-h2 font-bold text-cambridge leading-none w-[2.5ch] tabular-nums"
                      aria-hidden="true"
                    >
                      {total}
                    </span>
                    <span className="text-body-lg text-white group-hover:text-cambridge transition-colors duration-200">
                      {city}
                    </span>
                    <span
                      className="ml-auto text-white/40 group-hover:text-cambridge group-hover:translate-x-1 transition-all duration-200"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <span className="sr-only">
                      {total} members in {city}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Community Investor ribbon — slim nod, not the homepage grid ── */}
        <div className="mt-f34 lg:mt-f55 pt-f21 border-t border-white/10 flex flex-wrap items-baseline gap-x-f13 gap-y-f8">
          <p className="text-body-sm text-white/70">
            Backed by{" "}
            <span className="font-bold text-white">
              {investorCount} Community Investors
            </span>{" "}
            — the businesses leading Medina County.
          </p>
          <Link
            href="/membership/community-investor"
            className="
              text-body-sm font-bold text-cambridge hover:text-cambridge/80
              transition-colors duration-200
            "
          >
            Meet them <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

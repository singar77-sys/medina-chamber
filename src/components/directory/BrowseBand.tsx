"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IndustryChipStrip } from "./IndustryChipStrip";
import { getMembersByCity, getCommunityInvestors } from "@/data/members";
import { useTheme } from "@/components/ThemeProvider";

const FEATURED_CITIES = ["Medina", "Brunswick", "Wadsworth"] as const;

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
  const { theme } = useTheme();

  const cities = FEATURED_CITIES.map((city) => ({
    city,
    slug: city.toLowerCase(),
    total: getMembersByCity(city).length,
  })).filter((c) => c.total > 0);

  const investorCount = getCommunityInvestors().length;

  return (
    <section
      aria-labelledby="browse-band-heading"
      className="browse-band border-y border-border-primary py-f55 lg:py-f89"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-overline text-cambridge mb-f8 tracking-[0.18em]">
          Browse the directory
        </p>
        <h2 id="browse-band-heading" className="text-h2 text-text-primary">
          Every trade. <span className="text-cambridge">Every town.</span>
        </h2>
        <p className="text-body-lg text-text-secondary mt-f8 max-w-2xl">
          500+ member businesses across Medina County. Browse by
          what you need or where you are.
        </p>

        {/* Golden ratio: industries (major) : communities (minor) */}
        <div className="mt-f34 grid gap-f34 lg:gap-f55 lg:grid-cols-[1.618fr_1fr] items-start">
          {/* ── By industry ── */}
          <div>
            <div className="flex items-baseline justify-between mb-f13">
              <h3 className="text-caption uppercase tracking-[0.18em] font-bold">
                By industry
              </h3>
              <button
                type="button"
                onClick={onToggleExpand}
                aria-expanded={expanded}
                className="
                  text-caption text-text-tertiary hover:text-cambridge
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
              appearance={theme === "dark" ? "dark" : "light"}
              expanded={expanded}
            />

            <div className="mt-f21">
              <Button variant="primary" size="md" onClick={onSeeAll}>
                Browse all 500+ members{" "}
                <span aria-hidden="true" className="ml-f5">
                  →
                </span>
              </Button>
            </div>
          </div>

          {/* ── By community ── */}
          <div>
            <div className="flex items-baseline justify-between mb-f13">
              <h3 className="text-caption uppercase tracking-[0.18em] font-bold">
                By community
              </h3>
              <Link
                href="/community"
                className="
                  text-caption text-text-tertiary hover:text-cambridge
                  underline underline-offset-4 transition-colors duration-200
                "
              >
                See all <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ul>
              {cities.map(({ city, slug }) => (
                <li key={city}>
                  <Link
                    href={`/community/${slug}`}
                    className="
                      group flex items-center
                      py-f13 border-b border-border-primary
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:rounded
                    "
                  >
                    <span className="flex-1 text-body-lg text-text-primary group-hover:text-cambridge transition-colors duration-200">
                      {city}
                    </span>
                    <span
                      className="text-text-tertiary group-hover:text-cambridge group-hover:translate-x-1 transition-all duration-200"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <span className="sr-only">{city} member businesses</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Community Investor ribbon ── */}
        <div className="mt-f34 lg:mt-f55 pt-f21 border-t border-border-primary flex flex-wrap items-baseline gap-x-f13 gap-y-f8">
          <p className="text-body-sm text-text-secondary">
            Backed by{" "}
            <span className="font-bold text-text-primary">
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

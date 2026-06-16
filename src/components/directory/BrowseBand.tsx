"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IndustryChipStrip } from "./IndustryChipStrip";
import { getCommunityInvestors } from "@/data/members";
import { useTheme } from "@/components/ThemeProvider";

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
  const investorCount = getCommunityInvestors().length;

  return (
    <section
      aria-labelledby="browse-band-heading"
      className="browse-band border-y border-border-primary py-f89 lg:py-f144"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-col gap-f13 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-overline text-cambridge mb-f8 tracking-[0.18em]">
              Browse the directory
            </p>
            <h2 id="browse-band-heading" className="text-h2 text-text-primary">
              Every trade. <span className="text-cambridge">Every town.</span>
            </h2>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              500+ member businesses across Medina County. Search by industry or browse them all.
            </p>
          </div>
          <div className="shrink-0">
            <Button variant="primary" size="md" onClick={onSeeAll}>
              Browse all {memberCount}+ members{" "}
              <span aria-hidden="true" className="ml-f5">→</span>
            </Button>
          </div>
        </div>

        {/* Industry chips — full width */}
        <div className="mt-f55">
          <div className="flex items-baseline justify-between mb-f21">
            <h3 className="text-caption uppercase tracking-[0.18em] font-bold text-text-primary">
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
                "Show fewer"
              ) : (
                <>All {industries.length} categories <span aria-hidden="true">→</span></>
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
        </div>

        {/* Community Investor ribbon */}
        <div className="mt-f55 lg:mt-f89 pt-f34 border-t border-border-primary flex flex-wrap items-baseline gap-x-f13 gap-y-f8">
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

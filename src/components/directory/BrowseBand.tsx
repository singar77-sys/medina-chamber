"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { IndustryChipStrip } from "./IndustryChipStrip";
import { DirectorySearch } from "./DirectorySearch";
import type { RefObject } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { MouseGradient } from "@/components/MouseGradient";
import { BrandShaderBackgroundLazy } from "@/components/effects/BrandShaderBackgroundLazy";

interface BrowseBandProps {
  /** Controlled search query. */
  query: string;
  /** Forwarded to the search <input> so focus survives the browse/results
   *  swap (see DirectoryClient). */
  inputRef?: RefObject<HTMLInputElement | null>;
  /** Called on every search keystroke. */
  onQueryChange: (next: string) => void;
  /** Called when a search suggestion chip is clicked. */
  onSuggestionClick: (text: string) => void;
  /** Show the spinner inside the search field while a search is in flight. */
  isSearching?: boolean;
  /** Industries currently shown (top slice or full list). */
  visibleIndustries: ReadonlyArray<{ category: string; count: number }>;
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
  query,
  inputRef,
  onQueryChange,
  onSuggestionClick,
  isSearching = false,
  visibleIndustries,
  active,
  onSelect,
  onSeeAll,
  expanded,
  onToggleExpand,
}: BrowseBandProps) {
  const { theme } = useTheme();

  return (
    <section
      aria-labelledby="browse-band-heading"
      className="browse-band relative isolate overflow-hidden border-y border-border-primary"
    >
      {/* Fourth texture tried here (sigil → dots → honeycomb → this): the
          MemberVoice liquid-chrome shader wash leading, with a whisper of
          cursor flashlight over it — default glow read "more of a
          flashlight" than the MemberVoice gradient (Mark 2026-08-26), so
          it runs wide and faint. Shader sits at section level so the glow
          paints above it; padding lives on the MouseGradient wrapper so
          the glow tracks the full band. */}
      <BrandShaderBackgroundLazy className="mv-shader-bg" />
      <MouseGradient
        className="py-f89 lg:py-f144"
        color="rgba(131, 188, 169, 0.05)"
        radius={700}
      >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <p className="text-overline text-cambridge mb-f8 tracking-[0.18em]">
          Browse the directory
        </p>
        <h2 id="browse-band-heading" className="text-h2 text-text-primary">
          Every trade. <span className="text-cambridge">Every town.</span>
        </h2>
        <p className="text-body-lg text-text-secondary mt-f13">
          Member businesses from every corner of Medina County.
        </p>

        {/* Search — sits with the browsing tools, not orphaned in the hero */}
        <div className="mt-f34">
          <DirectorySearch
            inputRef={inputRef}
            query={query}
            onQueryChange={onQueryChange}
            onSuggestionClick={onSuggestionClick}
            isSearching={isSearching}
          />
        </div>

        {/* Industry chips */}
        <div className="mt-f55">
          <div className="flex items-center justify-between mb-f21">
            <h3 className="text-caption uppercase tracking-[0.18em] font-bold text-text-primary">
              Browse by industry
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
              {expanded
                ? "Show fewer"
                : <>All categories <span aria-hidden="true">→</span></>}
            </button>
          </div>

          <IndustryChipStrip
            industries={visibleIndustries}
            active={active}
            onSelect={onSelect}
            appearance={theme === "dark" ? "dark" : "light"}
            expanded={expanded}
            layoutMode="grid"
          />
        </div>

        {/* Bottom bar: CTA + CI ribbon */}
        <div className="mt-f55 pt-f34 border-t border-border-primary flex flex-col gap-f21 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="primary" size="md" onClick={onSeeAll}>
            Browse all members{" "}
            <span aria-hidden="true" className="ml-f5">→</span>
          </Button>

          <p className="text-body-sm text-text-secondary">
            Including{" "}
            <Link
              href="/membership/community-investor"
              className="font-bold text-text-primary hover:text-cambridge transition-colors duration-200"
            >
              our Community Investors
            </Link>
            {" "}— the businesses leading Medina County.
          </p>
        </div>
      </div>
      </MouseGradient>
    </section>
  );
}

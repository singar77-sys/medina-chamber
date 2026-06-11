"use client";

/**
 * Horizontal strip of top industry chips. Tapping a chip filters the
 * directory by that category via the onSelect callback (client-side
 * filter state in DirectoryClient).
 *
 * Two variants:
 *   - "browse" (default): full section with "Browse by industry" header,
 *     used on the unfiltered directory landing view.
 *   - "refine": compact chip row with no header or section padding, used
 *     at the top of search/filter results so the results grid stays high
 *     on the page.
 *
 * Future enhancement: switch chips to <Link> elements pointing at
 * /membership/directory/industry/[slug] once those static pages are built.
 */
interface IndustryChipStripProps {
  /** Top industries by member count: [{ category, count }, …]. */
  industries: ReadonlyArray<{ category: string; count: number }>;
  /** Total industry count (for the count badge, browse variant only). */
  totalCount: number;
  /** Currently active category (null if none). */
  active: string | null;
  /** Called when a chip is clicked. Passes null to clear. */
  onSelect: (category: string | null) => void;
  /** Optional: renders a "See all members" link under the chips (browse only). */
  onSeeAll?: () => void;
  /** Layout variant — see component docblock. */
  variant?: "browse" | "refine";
  /** Whether the full category list is currently shown (browse only). */
  expanded?: boolean;
  /** Optional: makes the count badge a toggle for the full list (browse only). */
  onToggleExpand?: () => void;
  /** "dark" renders glass chips for oxford-navy band backgrounds. */
  appearance?: "light" | "dark";
}

export function IndustryChipStrip({
  industries,
  totalCount,
  active,
  onSelect,
  onSeeAll,
  variant = "browse",
  expanded = false,
  onToggleExpand,
  appearance = "light",
}: IndustryChipStripProps) {
  if (industries.length === 0) return null;

  const chipClasses =
    appearance === "dark"
      ? {
          active: "bg-cambridge text-oxford border-cambridge hover:bg-cambridge/85",
          idle: "bg-white/5 text-white/85 border-white/15 hover:border-cambridge hover:text-white",
          count: { active: "opacity-70", idle: "text-white/45" },
          focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge",
        }
      : {
          active: "bg-cambridge text-bg-primary border-cambridge hover:bg-cambridge/85",
          idle: "bg-bg-primary text-text-secondary border-border-primary hover:border-cambridge hover:text-text-primary",
          count: { active: "opacity-70", idle: "text-text-tertiary" },
          focus:
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
        };

  const chips = (
    <div
      role="group"
      aria-label="Industry filters"
      className={
        expanded
          ? "flex flex-wrap gap-f8 pb-f8"
          : "flex gap-f8 overflow-x-auto pb-f8 -mx-6 px-6 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible"
      }
    >
      {industries.map(({ category, count }) => {
        const isActive = active === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(isActive ? null : category)}
            aria-pressed={isActive}
            className={`
              shrink-0
              text-body-sm font-medium
              px-f13 py-f8
              rounded-full
              border transition-colors duration-200
              ${chipClasses.focus}
              ${isActive ? chipClasses.active : chipClasses.idle}
            `}
          >
            {category}
            <span
              className={`ml-f5 ${isActive ? chipClasses.count.active : chipClasses.count.idle}`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (variant === "refine") {
    return <div aria-label="Refine by industry">{chips}</div>;
  }

  return (
    <section
      aria-labelledby="industries-heading"
      className="mx-auto max-w-7xl px-6 lg:px-8 py-f34"
    >
      <header className="flex items-baseline justify-between mb-f13">
        <h2 id="industries-heading" className="text-h3">
          Browse by industry
        </h2>
        {onToggleExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="
              text-caption text-text-tertiary hover:text-accent
              underline underline-offset-4 transition-colors duration-200
              focus-visible:outline-none focus-visible:text-accent
            "
          >
            {expanded ? (
              "Show top industries"
            ) : (
              <>
                All {totalCount} categories <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        ) : (
          <span className="text-caption text-text-tertiary">
            {totalCount} categories
          </span>
        )}
      </header>

      {chips}

      {onSeeAll && (
        <div className="mt-f13">
          <button
            type="button"
            onClick={onSeeAll}
            className="
              text-caption text-text-tertiary hover:text-accent
              underline underline-offset-4 transition-colors duration-200
              focus-visible:outline-none focus-visible:text-accent
            "
          >
            See all members <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}

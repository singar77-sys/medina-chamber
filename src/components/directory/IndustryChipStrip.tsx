"use client";

/**
 * Horizontal strip of top industry chips. Tapping a chip filters the
 * directory by that category via the onSelect callback (client-side
 * filter state in DirectoryClient).
 *
 * Compact chip row with no header or section padding, used at the top
 * of search/filter results so the results grid stays high on the page.
 *
 * Future enhancement: switch chips to <Link> elements pointing at
 * /membership/directory/industry/[slug] once those static pages are built.
 */
interface IndustryChipStripProps {
  /** Top industries by member count: [{ category, count }, …]. */
  industries: ReadonlyArray<{ category: string; count: number }>;
  /** Currently active category (null if none). */
  active: string | null;
  /** Called when a chip is clicked. Passes null to clear. */
  onSelect: (category: string | null) => void;
  /** Whether the full category list is currently shown. */
  expanded?: boolean;
  /** "dark" renders glass chips for oxford-navy band backgrounds. */
  appearance?: "light" | "dark";
  /** "grid" snaps chips into a fixed-column grid (use in browse band). */
  layoutMode?: "flex" | "grid";
}

export function IndustryChipStrip({
  industries,
  active,
  onSelect,
  expanded = false,
  appearance = "light",
  layoutMode = "flex",
}: IndustryChipStripProps) {
  if (industries.length === 0) return null;

  const chipClasses =
    appearance === "dark"
      ? {
          active: "bg-cambridge text-oxford border-cambridge hover:bg-cambridge/85",
          idle: "bg-white/5 text-white/85 border-white/15 hover:border-cambridge hover:text-white",
          focus: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge",
        }
      : {
          active: "bg-cambridge text-bg-primary border-cambridge hover:bg-cambridge/85",
          idle: "bg-bg-primary text-text-secondary border-border-primary hover:border-cambridge hover:text-text-primary",
          focus:
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
        };

  const isGrid = layoutMode === "grid";

  const containerClass = isGrid
    ? "grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-f8"
    : expanded
      ? "flex flex-wrap gap-f8 pb-f8"
      : "flex gap-f8 overflow-x-auto pb-f8 -mx-6 px-6 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible";

  const chips = (
    <div role="group" aria-label="Industry filters" className={containerClass}>
      {industries.map(({ category }) => {
        const isActive = active === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(isActive ? null : category)}
            aria-pressed={isActive}
            className={`
              ${isGrid ? "w-full flex-col py-f13 gap-f5" : "shrink-0 flex-row gap-f8 py-f8"}
              inline-flex items-center justify-center
              text-body-sm font-medium
              px-f13
              rounded-[var(--radius-md)]
              border transition-colors duration-200
              ${chipClasses.focus}
              ${isActive ? chipClasses.active : chipClasses.idle}
            `}
          >
            <span className={isGrid ? "text-center leading-tight" : ""}>{category}</span>
          </button>
        );
      })}
    </div>
  );

  return <div aria-label="Refine by industry">{chips}</div>;
}

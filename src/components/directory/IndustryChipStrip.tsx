"use client";

/**
 * Horizontal strip of top industry chips. Tapping a chip filters the
 * directory by that category via the onSelect callback (client-side
 * filter state in DirectoryClient).
 *
 * Future enhancement: switch chips to <Link> elements pointing at
 * /membership/directory/industry/[slug] once those static pages are built.
 */
interface IndustryChipStripProps {
  /** Top industries by member count: [{ category, count }, …]. */
  industries: ReadonlyArray<{ category: string; count: number }>;
  /** Total industry count (for the count badge). */
  totalCount: number;
  /** Currently active category (null if none). */
  active: string | null;
  /** Called when a chip is clicked. Passes null to clear. */
  onSelect: (category: string | null) => void;
}

export function IndustryChipStrip({
  industries,
  totalCount,
  active,
  onSelect,
}: IndustryChipStripProps) {
  if (industries.length === 0) return null;

  return (
    <section
      aria-labelledby="industries-heading"
      className="mx-auto max-w-7xl px-6 lg:px-8 py-f34"
    >
      <header className="flex items-baseline justify-between mb-f13">
        <h2 id="industries-heading" className="text-h3">
          Browse by industry
        </h2>
        <span className="text-caption text-text-tertiary">
          {totalCount} categories
        </span>
      </header>

      <div
        role="group"
        aria-label="Industry filters"
        className="
          flex gap-f8 overflow-x-auto pb-f8
          -mx-6 px-6 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible
        "
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
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                ${isActive
                  ? "bg-cambridge text-bg-primary border-cambridge hover:bg-cambridge/85"
                  : "bg-bg-primary text-text-secondary border-border-primary hover:border-cambridge hover:text-text-primary"}
              `}
            >
              {category}
              <span className={`ml-f5 ${isActive ? "opacity-70" : "text-text-tertiary"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

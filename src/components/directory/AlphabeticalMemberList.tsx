import Link from "next/link";
import { members, extractCity } from "@/data/members";

/**
 * Compact A-Z list of every member as a text link. Server-rendered;
 * crawlers index every entry. Visually backgrounded (tertiary text)
 * so the eye reads it as a directory reference, not the primary content.
 *
 * Replaces the previous `sr-only` SEO block with visible content —
 * visible server-rendered text indexes more reliably than aria-hidden
 * blocks and gives users who prefer browsing a real entry point.
 */
export function AlphabeticalMemberList() {
  const sorted = [...members].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );

  return (
    <section
      aria-labelledby="all-members-heading"
      className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 border-t border-border-secondary"
    >
      <header className="mb-f21">
        <p className="text-overline text-text-tertiary">All members</p>
        <h2 id="all-members-heading" className="text-h3 mt-f5">
          Every chamber business, A–Z
        </h2>
      </header>

      <ul
        className="
          columns-1 sm:columns-2 lg:columns-3
          gap-f21
          text-caption
        "
      >
        {sorted.map((m) => {
          const city = extractCity(m.address);
          const primary = m.categories[0];
          return (
            <li key={m.chamberSlug} className="mb-f5 break-inside-avoid">
              <Link
                href={`/membership/directory/${m.chamberSlug}`}
                className="
                  text-text-secondary hover:text-accent
                  focus-visible:outline-none focus-visible:text-accent focus-visible:underline focus-visible:underline-offset-2
                  transition-colors duration-200
                "
              >
                <span className="font-medium">{m.name}</span>
                {city && <span className="text-text-tertiary"> · {city}</span>}
                {primary && (
                  <span className="text-text-tertiary"> · {primary}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

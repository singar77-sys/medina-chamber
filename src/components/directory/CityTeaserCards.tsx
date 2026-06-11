import Link from "next/link";
import { getMembersByCity } from "@/data/members";

const FEATURED_CITIES = ["Medina", "Brunswick", "Wadsworth", "Lodi"] as const;

/**
 * Four featured city teaser cards on the main directory page.
 *
 * Each card links to the existing /community/[slug] page with the city
 * name and member count. Empty cities (no members) are skipped silently.
 */
export function CityTeaserCards() {
  const cards = FEATURED_CITIES.map((city) => {
    const all = getMembersByCity(city);
    return {
      city,
      slug: city.toLowerCase(),
      total: all.length,
    };
  }).filter((c) => c.total > 0);

  if (cards.length === 0) return null;

  return (
    <section
      aria-labelledby="cities-heading"
      className="mx-auto max-w-7xl px-6 lg:px-8 py-f55"
    >
      <header className="flex items-baseline justify-between mb-f21">
        <h2 id="cities-heading" className="text-h2">
          By community
        </h2>
        <Link
          href="/community"
          className="text-caption text-text-tertiary hover:text-accent underline underline-offset-4"
        >
          See all communities <span aria-hidden="true">→</span>
        </Link>
      </header>

      <ul className="grid gap-f13 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.city}>
            <CityCard {...c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CityCard({
  city,
  slug,
  total,
}: {
  city: string;
  slug: string;
  total: number;
}) {
  return (
    <Link
      href={`/community/${slug}`}
      className="
        group flex flex-col h-full
        bg-bg-primary border border-border-secondary
        rounded-[var(--radius-lg)] p-f21
        hover:border-cambridge hover:shadow-[var(--shadow-md)]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
        transition-all duration-200
      "
    >
      <header className="flex items-baseline justify-between mb-f13">
        <h3 className="text-h4 group-hover:text-accent transition-colors">{city}</h3>
        <span className="text-caption text-text-tertiary">{total}</span>
      </header>

      <p className="text-caption text-text-secondary mt-auto">
        See all in {city} <span aria-hidden="true">→</span>
      </p>
    </Link>
  );
}

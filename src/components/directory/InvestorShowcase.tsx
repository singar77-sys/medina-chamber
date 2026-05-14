import Link from "next/link";
import Image from "next/image";
import { getCommunityInvestors, getInitials, extractCity } from "@/data/members";

/**
 * Showcase of every current Community Investor. Server-rendered logo grid;
 * each tile links to the member's detail page.
 *
 * Phase 1: static grid, no spotlight animation. Spotlight rotation is
 * deferred to a later plan.
 */
export function InvestorShowcase() {
  const investors = getCommunityInvestors();

  if (investors.length === 0) return null;

  return (
    <section
      aria-labelledby="ci-heading"
      className="mx-auto max-w-7xl px-6 lg:px-8 py-f55"
    >
      <header className="flex items-baseline justify-between mb-f21">
        <div>
          <p className="text-overline text-cambridge">Community Investors</p>
          <h2 id="ci-heading" className="text-h2 mt-f5">
            Our top-tier members
          </h2>
        </div>
        <Link
          href="/membership/community-investor"
          className="text-caption text-text-tertiary hover:text-accent underline underline-offset-4"
        >
          About this tier <span aria-hidden="true">→</span>
        </Link>
      </header>

      <ul className="grid gap-f8 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
        {investors.map((m) => {
          const city = extractCity(m.address);
          return (
            <li key={m.chamberSlug}>
              <Link
                href={`/membership/directory/${m.chamberSlug}`}
                className="
                  group flex flex-col h-full
                  bg-bg-primary border border-border-secondary
                  rounded-[var(--radius-md)]
                  hover:border-cambridge hover:shadow-[var(--shadow-md)]
                  transition-all duration-200
                  overflow-hidden
                "
              >
                <div className="relative aspect-[4/3] bg-bg-secondary flex items-center justify-center overflow-hidden">
                  {m.logoUrl ? (
                    <Image
                      src={m.logoUrl}
                      alt={`${m.name} logo`}
                      fill
                      className="object-contain p-f8"
                      sizes="(max-width: 639px) 33vw, (max-width: 1023px) 25vw, 16vw"
                      unoptimized
                    />
                  ) : (
                    <span className="text-h4 font-bold text-text-tertiary group-hover:text-cambridge transition-colors">
                      {getInitials(m.name)}
                    </span>
                  )}
                </div>
                <div className="px-f8 py-f8 border-t border-border-secondary">
                  <p className="text-caption font-bold text-text-primary leading-tight line-clamp-2">
                    {m.name}
                  </p>
                  {city && (
                    <p className="text-caption text-text-tertiary mt-f5 truncate">
                      {city}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

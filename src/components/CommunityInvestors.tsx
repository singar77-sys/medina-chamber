import { readdirSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { members, isCommunityInvestor } from "@/data/members";
import { FadeIn } from "@/components/FadeIn";

/**
 * CommunityInvestors — homepage showcase of Chamber top-tier members.
 *
 * All light/dark theming is handled by [data-theme] rules in globals.css
 * (.ci-section, .ci-card). The [[data-theme=dark]_&]: Tailwind variant
 * applies in both themes due to @layer cascade ordering, so globals.css
 * unlayered rules are the correct override mechanism for this section.
 *
 * Logos are served from /public/images/members/logos/{chamberSlug}.{ext}.
 * Directory is scanned at module load — any extension works.
 */

function buildLogoMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const dir = join(process.cwd(), "public", "images", "members", "logos");
    for (const file of readdirSync(dir)) {
      const dot = file.lastIndexOf(".");
      if (dot === -1) continue;
      map.set(file.substring(0, dot), `/images/members/logos/${file}`);
    }
  } catch { /* directory absent — graceful no-logo fallback */ }
  return map;
}

const MEMBER_LOGOS = buildLogoMap();

export function CommunityInvestors() {
  const investors = members
    .filter(isCommunityInvestor)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (investors.length === 0) return null;

  return (
    <section className="ci-section bg-bg-secondary py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12 lg:mb-16">
            <div>
              <p className="text-overline text-cambridge mb-3 tracking-[0.2em]">
                Community Investors
              </p>
              <h2 className="text-h2 text-text-primary">
                The businesses leading<br />Medina County.
              </h2>
              <p className="text-body-sm text-text-secondary mt-3 max-w-md leading-relaxed">
                Our highest-tier members, investing in Medina County&apos;s
                business community at the top level.
              </p>
            </div>
            <Link
              href="/membership/join"
              className="
                shrink-0 self-start sm:self-auto
                inline-flex items-center gap-2 px-5 py-3
                border border-cambridge/40 hover:border-cambridge
                text-cambridge font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Become a Community Investor
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </FadeIn>

        {/* Grid — 3 cols (11 rows × 3 = 33) */}
        <FadeIn delay={100}>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {investors.map((m) => {
              const logoPath = MEMBER_LOGOS.get(m.chamberSlug);
              return (
                <li key={m.chamberSlug}>
                  <Link
                    href={`/membership/directory/${m.chamberSlug}`}
                    className="
                      ci-card group
                      flex flex-col justify-between
                      h-full min-h-[7rem]
                      p-4 lg:p-5
                      bg-white hover:bg-bg-tertiary
                      border border-border-secondary hover:border-border-primary
                      rounded-[var(--radius-md)]
                      transition-all duration-200
                    "
                  >
                    {logoPath ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoPath}
                        alt={`${m.name} logo`}
                        className="h-10 w-auto object-contain object-left mb-3 transition-opacity"
                      />
                    ) : null}

                    <div className="flex-1 flex flex-col justify-end">
                      <p className="text-body-sm font-semibold text-text-primary leading-snug">
                        {m.name}
                      </p>
                      {m.categories[0] && (
                        <p className="text-caption text-text-tertiary mt-1 leading-tight line-clamp-1">
                          {m.categories[0]}
                        </p>
                      )}
                    </div>

                    <p className="text-caption text-text-tertiary group-hover:text-text-primary mt-3 font-bold transition-colors">
                      View profile →
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </FadeIn>

        {/* Footer note */}
        <FadeIn delay={200}>
          <p className="mt-10 text-caption text-text-tertiary text-center">
            {investors.length} Community Investors · Greater Medina Chamber of Commerce ·{" "}
            <Link
              href="/membership/benefits"
              className="hover:text-cambridge transition-colors underline underline-offset-2"
            >
              See all membership tiers
            </Link>
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

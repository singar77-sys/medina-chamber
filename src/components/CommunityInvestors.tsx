import type { CSSProperties } from "react";
import { readdirSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { members, isCommunityInvestor, type Member } from "@/data/members";
import { FadeIn } from "@/components/FadeIn";

/**
 * CommunityInvestors — three-row infinite marquee of top-tier member logos.
 *
 * Rows 1 & 3 scroll right; row 2 scrolls left.
 * The marquee is contained within the site's max-w-7xl frame (not full-bleed).
 * Keyframe definitions live in globals.css (.ci-marquee-track).
 *
 * Accessibility:
 *   - Ghost (duplicate) tiles carry aria-hidden + tabIndex=-1.
 *   - prefers-reduced-motion disables animation and hides duplicates via CSS.
 * Logos served from /public/images/members/logos/{chamberSlug}.{ext}.
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

// Row 2 runs slightly slower to give the three tracks a natural rhythm.
const ROW_DURATIONS = [30, 37, 30] as const;
const ROW_DIRECTIONS = ["right", "left", "right"] as const;

interface LogoTileProps {
  m: Member;
  ghost?: boolean;
}

function LogoTile({ m, ghost = false }: LogoTileProps) {
  const logoPath = MEMBER_LOGOS.get(m.chamberSlug);
  return (
    <Link
      href={`/membership/directory/${m.chamberSlug}`}
      aria-hidden={ghost || undefined}
      tabIndex={ghost ? -1 : undefined}
      className={`
        ci-card
        flex-shrink-0 flex items-center justify-center
        w-36 h-[4.5rem] px-3
        bg-white border border-black/8 hover:border-cambridge/60
        rounded-[var(--radius-md)]
        transition-colors duration-200
        ${ghost ? "ci-marquee-dupe" : ""}
      `}
    >
      {logoPath ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={logoPath}
          alt={ghost ? "" : `${m.name} logo`}
          className="max-h-10 max-w-full w-auto object-contain mix-blend-multiply"
          loading="lazy"
        />
      ) : (
        <span className="text-caption text-text-secondary text-center leading-tight font-medium line-clamp-2">
          {m.name}
        </span>
      )}
    </Link>
  );
}

export function CommunityInvestors() {
  const investors = members
    .filter(isCommunityInvestor)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (investors.length === 0) return null;

  const rowSize = Math.ceil(investors.length / 3);
  const rows = [
    investors.slice(0, rowSize),
    investors.slice(rowSize, rowSize * 2),
    investors.slice(rowSize * 2),
  ].filter((r) => r.length > 0);

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
              href="/membership/community-investor"
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

        {/* Marquee — three tracks, contained within site framing */}
        <FadeIn delay={100}>
          <div className="space-y-3 overflow-hidden">
            {rows.map((row, ri) => {
              const direction = ROW_DIRECTIONS[ri] ?? "right";
              const dur = ROW_DURATIONS[ri] ?? 30;
              return (
                <div
                  key={ri}
                  className="overflow-hidden"
                  role="region"
                  aria-label={`Community investor logos, row ${ri + 1}`}
                >
                  <div
                    className="ci-marquee-track flex gap-3"
                    data-direction={direction}
                    style={{ "--ci-dur": `${dur}s` } as CSSProperties}
                  >
                    {/* Primary — keyboard-accessible links */}
                    {row.map((m) => (
                      <LogoTile key={m.chamberSlug} m={m} />
                    ))}
                    {/* Ghost duplicates — seamless loop; hidden from assistive tech */}
                    {row.map((m) => (
                      <LogoTile key={`${m.chamberSlug}--dupe`} m={m} ghost />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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

        {/* Member quote */}
        <FadeIn delay={300}>
          <figure className="mt-10 mx-auto max-w-2xl text-center">
            <blockquote className="text-body-lg lg:text-h4 text-text-primary italic leading-relaxed">
              &ldquo;Strong businesses help build strong communities. Through the Chamber, we&apos;re able to play an active role in making Medina County a great place for everyone.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-body-sm font-bold text-cambridge">
              Steve Allison &middot; Fire Dex
            </figcaption>
          </figure>
        </FadeIn>

      </div>
    </section>
  );
}

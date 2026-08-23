import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { members, isCommunityInvestor, type Member } from "@/data/members";
import { MEMBER_LOGOS } from "@/lib/member-logos";
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

// Row 2 runs slightly slower to give the three tracks a natural rhythm.
// Durations are deliberately long: a logo wall is for dwelling on, not
// reading at speed — each tile should stay legible as it passes.
const ROW_DURATIONS = [52, 62, 52] as const;
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
        w-36 h-[4.5rem] px-3 mr-3
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

export function CommunityInvestors({
  featuredQuote = false,
  backdropSrc,
}: { featuredQuote?: boolean; backdropSrc?: string } = {}) {
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
    <section className={`ci-section border-t border-border-secondary bg-bg-secondary py-20 lg:py-28${backdropSrc ? " relative overflow-hidden" : ""}`}>
      {backdropSrc && (
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <Image
            src={backdropSrc}
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
      )}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

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

        {/* Featured member quote — prominent, above the marquee. Only shown
            when featuredQuote is set (the Community Investor page). The home
            page keeps the smaller quote at the bottom of the section. */}
        {featuredQuote && (
          <FadeIn delay={50}>
            <figure className="mx-auto max-w-3xl text-center mb-12 lg:mb-16">
              <p
                className="text-h1 text-cambridge/30 leading-none font-bold select-none"
                aria-hidden="true"
              >
                &ldquo;
              </p>
              <blockquote className="mt-2 text-h3 lg:text-h2 text-text-primary font-medium leading-snug text-balance">
                Strong businesses help build strong communities. Through the
                Chamber, we&apos;re able to play an active role in making Medina
                County a great place for everyone.
              </blockquote>
              <figcaption className="mt-6 text-body-sm font-bold text-cambridge uppercase tracking-wider">
                Steve Allison &middot; Fire-Dex
              </figcaption>
            </figure>
          </FadeIn>
        )}

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
                  {/* `w-max` is load-bearing: translateX(-50%) resolves
                      against the track's OWN width. Without it the track is a
                      block box clamped to the container (~1078px), so -50%
                      shifted only ~539px — barely 3 tiles — then snapped back,
                      and the last tiles of each row never scrolled into view.
                      w-max sizes the track to its content (2 sets), making
                      -50% exactly one set: a seamless loop where every tile
                      gets a full pass.
                      No flex `gap` either: it puts N-1 gaps between 2N tiles,
                      leaving -50% a half-gap short. Spacing lives on each tile
                      (mr-3) so every child is a uniform width. */}
                  <div
                    className="ci-marquee-track flex w-max"
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
            Community Investors · Greater Medina Chamber of Commerce ·{" "}
            <Link
              href="/membership/benefits"
              className="hover:text-cambridge transition-colors underline underline-offset-2"
            >
              See all membership tiers
            </Link>
          </p>
        </FadeIn>

        {/* Member quote — smaller, at the bottom (home page default). The
            Community Investor page shows the featured version above instead. */}
        {!featuredQuote && (
          <FadeIn delay={300}>
            <figure className="mt-10 mx-auto max-w-2xl text-center">
              <blockquote className="text-body-lg lg:text-h4 text-text-primary italic leading-relaxed">
                &ldquo;Strong businesses help build strong communities. Through the Chamber, we&apos;re able to play an active role in making Medina County a great place for everyone.&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-body-sm font-bold text-cambridge">
                Steve Allison &middot; Fire-Dex
              </figcaption>
            </figure>
          </FadeIn>
        )}

      </div>
    </section>
  );
}

"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";

/**
 * PartnersMarquee — the "Partners & Sponsors" block on the homepage.
 *
 * Static responsive grid with enhanced tile design. Each tile reveals a
 * one-line tagline on hover explaining the nature of the partnership
 * (savings partner, community partner, etc.) — turns a vanity logo
 * strip into context.
 *
 * Name preserved for compatibility; the visual is now a grid, not a
 * ticker.
 */

interface Partner {
  name: string;
  logo: string;
  href: string;
  /** 1-line descriptor of what the relationship is. */
  tagline: string;
  external?: boolean;
  /**
   * Optional scale for the logo image inside its tile. A few source
   * PNGs (Hunter Consulting in particular) ship with heavy internal
   * whitespace that makes the actual mark render smaller than tiles
   * whose art fills edge-to-edge. A per-tile scale bump levels them.
   */
  logoScale?: number;
}

const PARTNERS: Partner[] = [
  {
    name: "Medina County Safety Council",
    logo: "/images/partners/medina-county-safety-council.png",
    href: "/programs/safety-council",
    tagline: "Workplace safety training & BWC rebates",
  },
  {
    name: "Medina County Young Professionals Association",
    logo: "/images/partners/medina-county-young-professionals-association.jpg",
    href: "https://www.facebook.com/MedinaCountyYPA/",
    external: true,
    tagline: "Next-generation business networking",
  },
  {
    name: "Community Energy Advisors",
    logo: "/images/partners/community-energy-advisors.jpg",
    href: "/membership/savings",
    tagline: "Energy procurement savings program",
  },
  {
    name: "Anthem Insurance",
    logo: "/images/partners/anthem-insurance.jpg",
    href: "/membership/savings",
    tagline: "Member health insurance benefits",
  },
  {
    name: "Hunter Consulting",
    logo: "/images/partners/hunter-consulting.png",
    href: "/membership/savings",
    tagline: "Workers' compensation savings",
    // Source PNG has heavy internal whitespace; a small scale bump
    // brings its visual weight in line with neighbors without making
    // the horn/wordmark crowd the tile edges.
    logoScale: 1.15,
  },
  {
    name: "Medina City Schools",
    logo: "/images/partners/medina-city-schools.png",
    href: "https://www.medinabees.org",
    external: true,
    tagline: "Community education partner",
  },
];

export function PartnersMarquee() {
  return (
    <section className="pm-section bg-bg-secondary border-y border-border-secondary py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="max-w-3xl mb-10 lg:mb-14">
            <p className="text-overline text-cambridge mb-3">Partners & Sponsors</p>
            <h2 className="text-h2">Built on strong relationships.</h2>
            <p className="text-body-lg text-text-secondary mt-4 leading-relaxed">
              These organizations power the programs, savings, and community
              our members count on. Every Chamber initiative is stronger
              because of the partners standing with us.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={150}>
          <div className="pm-grid grid grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-5">
            {PARTNERS.map((p) => {
              const inner = (
                <>
                  <div
                    className="pm-tile__logo"
                    style={
                      p.logoScale
                        ? ({ "--pm-logo-scale": p.logoScale } as CSSProperties)
                        : undefined
                    }
                  >
                    <Image
                      src={p.logo}
                      alt={`${p.name} logo — Medina Chamber partner`}
                      width={140}
                      height={140}
                      className="pm-tile__img"
                    />
                  </div>
                  <div className="pm-tile__caption" aria-hidden="true">
                    <p className="pm-tile__name">{p.name}</p>
                    <p className="pm-tile__tag">{p.tagline}</p>
                  </div>
                </>
              );
              return p.external ? (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pm-tile"
                  title={`${p.name} — ${p.tagline}`}
                >
                  {inner}
                </a>
              ) : (
                <Link
                  key={p.name}
                  href={p.href}
                  className="pm-tile"
                  title={`${p.name} — ${p.tagline}`}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </FadeIn>

        <FadeIn delay={250}>
          <div className="flex items-center justify-between flex-wrap gap-4 border-t border-border-secondary pt-6 mt-10 lg:mt-14">
            <p className="text-body-sm text-text-tertiary">
              Interested in becoming a Chamber sponsor?
            </p>
            <Link
              href="/events/sponsorships"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              See sponsorship opportunities →
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

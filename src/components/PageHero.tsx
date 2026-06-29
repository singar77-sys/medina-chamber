import Image from "next/image";
import type { ReactNode } from "react";

/**
 * PageHero — the chamber's signature full-bleed hero.
 *
 * A min-h-[42rem] section with a faint (opacity-0.33) full-bleed photo backdrop
 * behind an overline + two-line display headline + optional subtitle. This is the
 * exact inline hero used across the rest of the site (e.g. /events, /jobs); pages
 * that previously had a flat text hero use this component so every page shares the
 * same hero treatment.
 *
 * Pass `breadcrumb` to render a breadcrumb nav above the overline (for sub-pages),
 * and `children` for any extra hero content (e.g. a back-link or count sub-label).
 */
export function PageHero({
  overline,
  titleTop,
  titleAccent,
  subtitle,
  image,
  objectPosition,
  breadcrumb,
  children,
}: {
  overline: ReactNode;
  titleTop: ReactNode;
  titleAccent: ReactNode;
  subtitle?: ReactNode;
  image: string;
  /** CSS object-position for the ghosted photo, e.g. "center 25%" to keep faces
   *  in frame on wide desktop crops. Defaults to centre. */
  objectPosition?: string;
  breadcrumb?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
      {/* Ghosted full-bleed photo backdrop */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <Image
          src={image}
          alt=""
          fill
          priority
          className="object-cover opacity-[0.33]"
          style={objectPosition ? { objectPosition } : undefined}
          sizes="100vw"
          quality={60}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="max-w-3xl">
          {breadcrumb && <div className="mb-f21">{breadcrumb}</div>}
          <p className="text-overline text-cambridge mb-f8">{overline}</p>
          <h1 className="text-display">
            <span className="block">{titleTop}</span>
            <span className="block text-accent">{titleAccent}</span>
          </h1>
          {subtitle && (
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

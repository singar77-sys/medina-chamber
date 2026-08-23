/**
 * GazeboHero — the theme-aware full-bleed hero used on the homepage and the
 * Medina-Means-Business page.
 *
 * Deliberately NOT next/image. The hero is the LCP element, and routing it
 * through the on-demand image optimizer means the first request after every
 * deploy re-encodes AVIF from scratch (~1-3s of cold-cache latency) before a
 * single byte ships — which no amount of `priority`/preload can mask. Instead
 * we serve pre-generated static AVIF/WebP from /public/images/heroes via
 * <picture>, so the CDN streams the bytes instantly on the very first hit.
 *
 * Theme handling: the site uses a manual `data-theme` toggle, so SSR can't
 * know which variant is visible. Both ship with the page and CSS shows one.
 * The default-visible DAY hero carries fetchPriority="high" (it's the LCP on
 * the common light/system first paint); NIGHT stays eager but fetchPriority=
 * "low" so it no longer competes for bandwidth with the LCP image on light.
 * Both remain eager — never lazy — so dark-mode users still get their hero on
 * the initial request path (dropping one to lazy broke dark-mode LCP before).
 * Regenerate assets with scripts if the source photos change.
 */

interface Variant {
  /** Path prefix for the generated files, e.g. "/images/heroes/gazebo-daytime". */
  base: string;
  /** Widths (px) that exist on disk as `${base}-${w}.{avif,webp}`. */
  widths: number[];
  /** Original full-size JPEG, used as the universal <img> fallback. */
  jpg: string;
  alt: string;
}

const DAY: Variant = {
  base: "/images/heroes/gazebo-daytime",
  widths: [768, 1280, 1536],
  jpg: "/images/photos/gazebo-daytime-flag.jpg",
  alt: "Historic Medina Square gazebo",
};

const NIGHT: Variant = {
  base: "/images/heroes/gazebo-night",
  widths: [768, 1280, 1365],
  jpg: "/images/photos/gazebo-night-flag.jpg",
  alt: "Historic Medina gazebo at night",
};

const srcSet = (base: string, ext: string, widths: number[]) =>
  widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(", ");

function HeroPicture({
  v,
  imgClass,
  priority,
}: {
  v: Variant;
  imgClass: string;
  priority: "high" | "low";
}) {
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={srcSet(v.base, "avif", v.widths)} sizes="100vw" />
      <source type="image/webp" srcSet={srcSet(v.base, "webp", v.widths)} sizes="100vw" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={v.jpg}
        alt={v.alt}
        sizes="100vw"
        fetchPriority={priority}
        decoding="async"
        className={imgClass}
      />
    </picture>
  );
}

export function GazeboHero({ kenBurns = false }: { kenBurns?: boolean }) {
  const fill = "absolute inset-0 h-full w-full object-cover object-center";
  const burns = kenBurns ? " hero-ken-burns" : "";
  return (
    <>
      <HeroPicture v={DAY} priority="high" imgClass={`${fill}${burns} [[data-theme=dark]_&]:hidden`} />
      <HeroPicture v={NIGHT} priority="low" imgClass={`${fill}${burns} hidden [[data-theme=dark]_&]:block`} />
    </>
  );
}

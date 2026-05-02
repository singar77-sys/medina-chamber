import { IlluminatiTriangle } from "./IlluminatiTriangle";

/**
 * BuildCredit — the "Designed by Hunter Systems" footer mark.
 *
 * Server Component. Breath animation is pure CSS (see globals.css
 * `.hs-mark` block) so no client JS is shipped for this credit.
 * The illuminati triangle is inline SVG, currentColor-themed.
 */
export function BuildCredit() {
  return (
    <a
      href="https://huntersystems.dev"
      target="_blank"
      rel="noopener noreferrer"
      className="hs-credit inline-flex items-center gap-2 group"
      aria-label="Designed by Hunter Systems, opens huntersystems.dev in a new tab"
    >
      <span className="text-caption text-text-tertiary">Built by</span>
      <span className="hs-mark inline-flex items-center gap-1.5">
        <span className="hs-mark__word">Hunter Systems</span>
        <IlluminatiTriangle className="hs-mark__sigil" />
      </span>
    </a>
  );
}

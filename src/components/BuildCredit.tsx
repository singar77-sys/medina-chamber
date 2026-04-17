import { MetatronSigil } from "./MetatronSigil";

/**
 * BuildCredit — the "Designed by Hunter Systems" footer mark.
 *
 * Server Component. Pulse animation is pure CSS (see globals.css
 * `.hs-mark` block) so no client JS is shipped for this credit.
 * The Metatron sigil is generated geometrically as inline SVG.
 */
export function BuildCredit() {
  return (
    <a
      href="https://huntersystems.dev"
      target="_blank"
      rel="noopener noreferrer"
      className="hs-credit inline-flex items-center gap-2 group"
      aria-label="Designed by Hunter Systems — opens huntersystems.dev in a new tab"
    >
      <span className="text-caption text-text-tertiary">Designed by</span>
      <span className="hs-mark inline-flex items-center gap-1.5">
        <span className="hs-mark__word">Hunter Systems</span>
        <MetatronSigil className="hs-mark__sigil" />
      </span>
    </a>
  );
}

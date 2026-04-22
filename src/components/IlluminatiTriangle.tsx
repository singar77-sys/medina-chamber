/**
 * IlluminatiTriangle — matches the mark on huntersystems.dev exactly.
 *
 * Geometry and per-element alphas are lifted from the Hunter Systems
 * homepage. Color is `currentColor` everywhere (controlled by the
 * surrounding context) — on the Chamber site that's cambridge; on
 * huntersystems.dev it's the mint teal brand color. Same glyph,
 * different paint.
 *
 * No transform / rotation — the triangle is static. The parent
 * `.hs-mark__sigil` breathes in opacity only.
 */

interface IlluminatiTriangleProps {
  className?: string;
}

export function IlluminatiTriangle({ className = "" }: IlluminatiTriangleProps) {
  return (
    <svg
      viewBox="0 0 28 28"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      {/* Outer pyramid — apex at top, tiny tint fill + crisp stroke */}
      <polygon
        points="14,2 27,26 1,26"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.75"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Iris — almond ellipse */}
      <ellipse
        cx="14"
        cy="18"
        rx="4.5"
        ry="3.2"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="0.7"
      />

      {/* Eyelid curves — upper and lower arcs */}
      <path
        d="M 9.5 18 Q 14 13.5 18.5 18"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="0.4"
      />
      <path
        d="M 9.5 18 Q 14 22.5 18.5 18"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="0.4"
      />

      {/* Pupil — filled dot in brand orange (coquelicot). The rest of the
         mark stays currentColor so it tints to wherever it's placed, but
         the pupil is the intentional hit of brand — matches the accent
         role coquelicot plays across the site. */}
      <circle
        cx="14"
        cy="18"
        r="1.8"
        fill="var(--coquelicot, #FF4000)"
        fillOpacity="0.95"
      />

      {/* Apex dot — small keystone marker */}
      <circle
        cx="14"
        cy="2"
        r="0.8"
        fill="currentColor"
        fillOpacity="0.6"
      />
    </svg>
  );
}

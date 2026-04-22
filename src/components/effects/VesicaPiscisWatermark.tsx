/**
 * VesicaPiscisWatermark — the sacred-geometry watermark sitting behind
 * "Why Members Join" on the homepage.
 *
 * Geometry faithfully mirrors the classic construction:
 *   • Two primary circles of equal radius whose centers lie on each
 *     other's circumferences — the "vesica piscis" (mandorla) is the
 *     almond region where they overlap.
 *   • A third smaller circle sits inside the mandorla (the "seed").
 *   • Dashed construction lines + the two triangles that the ancients
 *     drew through the mandorla's corners to show the √3 relationship.
 *
 * Rendered as a thin line-art SVG in currentColor so it tints cleanly
 * to whatever the parent text color is. Outer element breathes
 * (opacity + scale) while the inner <g> spins on a separate keyframe
 * track — wrapping the content in its own group is necessary because
 * the standalone `rotate` CSS property doesn't reliably interpolate
 * via @keyframes in every engine, whereas `transform: rotate()` on a
 * child always does.
 *
 * Primary circles are radius R=120 with centers at (±60, 0). That puts
 * their outer edges at x = ±180, so the viewBox has to go wider than
 * that or the circles clip at both horizontal ends. We use a generous
 * 420-unit square viewBox (−210 to +210 on both axes) to leave visual
 * breathing room for the whole construction.
 */

interface Props {
  className?: string;
}

export function VesicaPiscisWatermark({ className = "" }: Props) {
  // Construction math, origin centered in the viewBox.
  // Primary circle radius = 120, centers at ±60 on X.
  // Intersections are at (0, ±R·√3/2) = (0, ±103.923).
  const R = 120;
  const cx1 = -60;
  const cx2 = 60;
  const iY = (R * Math.sqrt(3)) / 2; // ≈ 103.923

  return (
    <svg
      className={`vp-watermark ${className}`}
      viewBox="-210 -210 420 420"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
      fill="none"
      stroke="currentColor"
    >
      {/* Rotor group — carries the spin animation so the outer SVG can
          keep its breath (scale+opacity) untouched. Nothing in the
          rotor shifts position; rotation pivots on (0, 0) which is the
          natural center of the construction. */}
      <g className="vp-rotor">
        {/* Two primary circles — the core of the vesica. */}
        <circle cx={cx1} cy="0" r={R} strokeWidth="1.1" strokeOpacity="0.85" />
        <circle cx={cx2} cy="0" r={R} strokeWidth="1.1" strokeOpacity="0.85" />

        {/* Small central seed circle — fits inside the mandorla. Its
            diameter equals half the mandorla's height. */}
        <circle
          cx="0"
          cy="0"
          r={iY * 0.5}
          strokeWidth="0.9"
          strokeOpacity="0.7"
        />

        {/* Upper and lower triangles drawn through the four cardinal
            points of the mandorla:
              top    (0,  iY)
              bottom (0, -iY)
              left   (-60, 0)
              right  (+60, 0) */}
        <path
          d={`M ${-60} 0 L 0 ${-iY} L 60 0 Z`}
          strokeWidth="0.7"
          strokeOpacity="0.55"
          strokeDasharray="3 3"
        />
        <path
          d={`M ${-60} 0 L 0 ${iY} L 60 0 Z`}
          strokeWidth="0.7"
          strokeOpacity="0.55"
          strokeDasharray="3 3"
        />

        {/* Horizontal + vertical construction axes. */}
        <line
          x1="-60"
          y1="0"
          x2="60"
          y2="0"
          strokeWidth="0.6"
          strokeOpacity="0.45"
          strokeDasharray="2 3"
        />
        <line
          x1="0"
          y1={-iY}
          x2="0"
          y2={iY}
          strokeWidth="0.6"
          strokeOpacity="0.45"
          strokeDasharray="2 3"
        />

        {/* Four tiny intersection dots — nodes of the construction. */}
        <circle cx={-60} cy="0" r="1.6" fill="currentColor" fillOpacity="0.55" />
        <circle cx={60} cy="0" r="1.6" fill="currentColor" fillOpacity="0.55" />
        <circle cx="0" cy={-iY} r="1.6" fill="currentColor" fillOpacity="0.55" />
        <circle cx="0" cy={iY} r="1.6" fill="currentColor" fillOpacity="0.55" />
      </g>
    </svg>
  );
}

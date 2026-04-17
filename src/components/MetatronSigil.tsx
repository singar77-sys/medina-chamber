/**
 * MetatronSigil — 13-circle Fruit of Life with full Metatron's Cube
 * interconnections (all 78 pairwise lines between circle centers).
 *
 * Server-renderable. Geometry is computed once at build time from the
 * viewBox dimensions below. currentColor drives both stroke and circle
 * outline so it themes with the surrounding text.
 */

const VIEWBOX = 64;
const CENTER = VIEWBOX / 2;
const RADIUS_INNER = 10;   // inner ring distance from center
const RADIUS_OUTER = 20;   // outer ring distance from center
const CIRCLE_R = 4;        // drawn circle radius

function polar(radius: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180; // -90 puts 0° at the top
  return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)];
}

const CENTERS: Array<[number, number]> = [
  [CENTER, CENTER],
  ...Array.from({ length: 6 }, (_, i) => polar(RADIUS_INNER, i * 60)),
  ...Array.from({ length: 6 }, (_, i) => polar(RADIUS_OUTER, i * 60)),
];

// All 78 pairwise connections.
const LINES: Array<[number, number, number, number]> = [];
for (let i = 0; i < CENTERS.length; i++) {
  for (let j = i + 1; j < CENTERS.length; j++) {
    LINES.push([
      CENTERS[i][0],
      CENTERS[i][1],
      CENTERS[j][0],
      CENTERS[j][1],
    ]);
  }
}

interface MetatronSigilProps {
  className?: string;
  /** Override the default stroke width if needed */
  strokeWidth?: number;
}

export function MetatronSigil({
  className = "",
  strokeWidth = 0.45,
}: MetatronSigilProps) {
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
      role="presentation"
    >
      {LINES.map(([x1, y1, x2, y2], i) => (
        <line
          key={`l-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          strokeWidth={strokeWidth}
          strokeOpacity={0.55}
        />
      ))}
      {CENTERS.map(([cx, cy], i) => (
        <circle
          key={`c-${i}`}
          cx={cx}
          cy={cy}
          r={CIRCLE_R}
          strokeWidth={strokeWidth * 1.6}
        />
      ))}
    </svg>
  );
}

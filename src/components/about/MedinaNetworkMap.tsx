"use client";

import { useState } from "react";

/**
 * MedinaNetworkMap — stylized Medina County network.
 *
 * Every community the chamber serves, connected to the downtown Medina
 * HQ by a gentle curved path. A glowing coquelicot orb rides each curve
 * from HQ outward on a staggered loop, so the connections are always
 * visible AND the network reads as actively flowing.
 *
 * Node placement is PROJECTED FROM REAL COORDINATES (see PLACES), not
 * hand-tuned. An earlier hand-placed version claimed to follow compass
 * bearings but didn't: Valley City (really NNW) and Lafayette (really
 * SW) were both drawn east of HQ, ~90-100° wrong. Deriving x/y from
 * lat/lon makes that class of mistake impossible and means adding a
 * community is a one-line data change.
 *
 * Uses SVG `<animateMotion>` for the orbs — simple, GPU-accelerated,
 * and the orb follows the exact path we've drawn (no drift).
 *
 * Accessibility: nodes are non-interactive (redesign pending), so they
 * are plain <g> groups with a <title> rather than links.
 */

/** Geocoded from 139 N. Court Street, Suite A, Medina OH 44256. */
const HQ_COORD = { lat: 41.14019, lon: -81.8641 } as const;

interface Place {
  key: string;
  name: string;
  lat: number;
  lon: number;
  /**
   * Nearby subdivision(s) this dot stands in for. Medina County stacks
   * villages inside townships (Lodi sits in Harrisville Twp, Valley City
   * in Liverpool Twp, and so on) — at map scale their centers are within
   * a few px, so drawing both would just print one label on top of the
   * other. We keep the name people would actually search for and name
   * the absorbed subdivision in the tooltip.
   */
  covers?: string;
}

/**
 * Medina County's civil subdivisions — 4 cities, 7 villages, 17
 * townships and 2 CDPs, per the county's Wikipedia article. Coordinates
 * are from Wikipedia infoboxes and OpenStreetMap/Nominatim.
 *
 * Ordered north → south purely for readability; render order doesn't
 * matter since positions come from the coordinates.
 */
const PLACES: Place[] = [
  // ── north tier (Cuyahoga county line) ──────────────────────────────
  { key: "brunswick",        name: "Brunswick",        lat: 41.24568, lon: -81.82754, covers: "Brunswick Hills Twp" },
  { key: "hinckley",         name: "Hinckley Twp",     lat: 41.23929, lon: -81.73513 },
  { key: "valley-city",      name: "Valley City",      lat: 41.23763, lon: -81.92876, covers: "Liverpool Twp" },
  // ── north-central ──────────────────────────────────────────────────
  { key: "litchfield",       name: "Litchfield Twp",   lat: 41.16876, lon: -82.02401 },
  { key: "york",             name: "York Twp",         lat: 41.16843, lon: -81.92646 },
  { key: "medina-twp",       name: "Medina Twp",       lat: 41.16843, lon: -81.83153 },
  { key: "granger",          name: "Granger Twp",      lat: 41.16882, lon: -81.73560 },
  // ── central ────────────────────────────────────────────────────────
  { key: "spencer",          name: "Spencer",          lat: 41.09972, lon: -82.12556, covers: "Spencer Twp" },
  { key: "chatham",          name: "Chatham Twp",      lat: 41.09971, lon: -82.02552 },
  { key: "lafayette",        name: "Lafayette Twp",    lat: 41.09922, lon: -81.93514 },
  { key: "montville",        name: "Montville Twp",    lat: 41.09935, lon: -81.83194 },
  { key: "sharon-center",    name: "Sharon Center",    lat: 41.09978, lon: -81.73569, covers: "Sharon Twp" },
  { key: "chippewa-lake",    name: "Chippewa Lake",    lat: 41.07361, lon: -81.90472, covers: "Gloria Glens Park" },
  // ── south tier (Wayne / Ashland county line) ───────────────────────
  { key: "homer",            name: "Homer Twp",        lat: 41.02888, lon: -82.12494 },
  { key: "lodi",             name: "Lodi",             lat: 41.03528, lon: -82.00694, covers: "Harrisville Twp" },
  { key: "westfield-center", name: "Westfield Center", lat: 41.02833, lon: -81.93139, covers: "Westfield Twp" },
  { key: "seville",          name: "Seville",          lat: 41.02639, lon: -81.87556 },
  { key: "guilford",         name: "Guilford Twp",     lat: 41.02554, lon: -81.82225 },
  { key: "wadsworth",        name: "Wadsworth",        lat: 41.01944, lon: -81.74306, covers: "Wadsworth Twp" },
  { key: "rittman",          name: "Rittman",          lat: 40.98611, lon: -81.79583 },
  { key: "creston",          name: "Creston",          lat: 40.97667, lon: -81.90000 },
];

/* ── Canvas layout ───────────────────────────────────────────────────
 * The county is ~1.1:1, so the canvas has to be roughly square for the
 * map to fill it — the map is limited by canvas HEIGHT, never width.
 * The original 1200x440 banner could therefore only ever fill ~39% of
 * its own width, which is what made it look marooned in dead space.
 *
 * At 1200x900 the county spans ~77% of the width and ~93% of the height.
 * Going fuller still means a taller section: 100% width fill would need
 * a ~1100-tall canvas (i.e. a full screen on most laptops).
 *
 * Nothing floats over the map any more — the address moved up into the
 * section header — so the whole canvas belongs to the geography.
 *
 * Keep `aspect-ratio` on .mnm-wrap in globals.css in step with these.
 */
const VIEW_W = 1200;
const VIEW_H = 900;
const MAP_TOP = 30;
const MAP_BOTTOM = 870;

/* ── Projection ──────────────────────────────────────────────────────
 * Equirectangular, centered on HQ. Over a 35km-wide county the
 * distortion is far below one pixel, and unlike a stretched fit it
 * preserves true bearings — north is up and west is left, always.
 */
const KM_PER_DEG_LAT = 110.99;
/**
 * 111.32 × cos(HQ latitude), PRE-COMPUTED ON PURPOSE — do not inline the
 * Math.cos call. ECMAScript lets each engine approximate cos() its own
 * way, so Node and the browser disagreed in the last bits, every derived
 * coordinate inherited the drift, and React reported a hydration
 * mismatch on the rendered attributes. A literal is identical everywhere.
 * Recompute only if HQ_COORD.lat changes.
 */
const KM_PER_DEG_LON = 83.83532493872994;

/** Offset from HQ in kilometres: +x east, +y north. */
function toKm(lat: number, lon: number) {
  return {
    x: (lon - HQ_COORD.lon) * KM_PER_DEG_LON,
    y: (lat - HQ_COORD.lat) * KM_PER_DEG_LAT,
  };
}

/**
 * Round every coordinate before it reaches the DOM. Belt-and-braces
 * against the hydration mismatch above: at 2dp no plausible float drift
 * can change the string React renders.
 */
const px = (n: number) => Math.round(n * 100) / 100;

const KM_POINTS = [toKm(HQ_COORD.lat, HQ_COORD.lon), ...PLACES.map((p) => toKm(p.lat, p.lon))];
const KM_MIN_X = Math.min(...KM_POINTS.map((p) => p.x));
const KM_MAX_X = Math.max(...KM_POINTS.map((p) => p.x));
const KM_MIN_Y = Math.min(...KM_POINTS.map((p) => p.y));
const KM_MAX_Y = Math.max(...KM_POINTS.map((p) => p.y));

/** One scale for both axes — this is what keeps the county's shape true. */
const SCALE = (MAP_BOTTOM - MAP_TOP) / (KM_MAX_Y - KM_MIN_Y);
const MAP_W = (KM_MAX_X - KM_MIN_X) * SCALE;
/** Centre the map in the canvas. */
const MAP_LEFT = (VIEW_W - MAP_W) / 2;

function project(lat: number, lon: number) {
  const { x, y } = toKm(lat, lon);
  return {
    x: px(MAP_LEFT + (x - KM_MIN_X) * SCALE),
    y: px(MAP_TOP + (KM_MAX_Y - y) * SCALE), // SVG y grows downward
  };
}

interface PlacedNode extends Place {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  labelX: number;
  labelY: number;
}

const HQ_POS = project(HQ_COORD.lat, HQ_COORD.lon);

/* ── Label placement ─────────────────────────────────────────────────
 * These are survey-grid townships roughly 8km apart, which leaves only
 * ~100px between neighbouring dots. A fixed rule ("push the label
 * outward from the centre") fails here, because outward is precisely
 * where the next community sits — it put five labels on top of their
 * neighbours' dots. So instead: try a handful of offsets per node and
 * take the first that collides with nothing already on the map.
 *
 * Pure math over a constant list, evaluated once at module load, so the
 * server and client always agree.
 */
const LABEL_CHAR_W = 7.3; // ≈ advance width per char at 14px/600
const LABEL_H = 14;
const DOT_R = 9;

/** Ordered by preference: below, above, then out to either side. */
const LABEL_CANDIDATES = [
  { anchor: "middle", dx: 0, dy: 24 },
  { anchor: "middle", dx: 0, dy: -16 },
  { anchor: "start", dx: 13, dy: 5 },
  { anchor: "end", dx: -13, dy: 5 },
  { anchor: "middle", dx: 0, dy: 37 },
  { anchor: "middle", dx: 0, dy: -29 },
] as const;

interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const hits = (a: Box, b: Box) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function labelBox(cx: number, cy: number, name: string, c: (typeof LABEL_CANDIDATES)[number]): Box {
  const w = name.length * LABEL_CHAR_W;
  const x = c.anchor === "middle" ? cx - w / 2 : c.anchor === "start" ? cx + c.dx : cx + c.dx - w;
  const baseline = cy + c.dy;
  return { x1: x, y1: baseline - LABEL_H + 2, x2: x + w, y2: baseline + 3 };
}

const POSITIONED = PLACES.map((p) => ({ ...p, ...project(p.lat, p.lon) }));

/** Decorative compass, top-right. Declared here so labels route around it. */
const COMPASS_X = VIEW_W - 78;
const COMPASS_Y = 62;

/** Every dot is an obstacle — plus HQ, its label, and the compass. */
const OBSTACLES: Box[] = [
  ...POSITIONED.map((p) => ({ x1: p.x - DOT_R, y1: p.y - DOT_R, x2: p.x + DOT_R, y2: p.y + DOT_R })),
  { x1: HQ_POS.x - 18, y1: HQ_POS.y - 18, x2: HQ_POS.x + 18, y2: HQ_POS.y + 18 },
  { x1: HQ_POS.x - 52, y1: HQ_POS.y - 38, x2: HQ_POS.x + 52, y2: HQ_POS.y - 18 }, // HQ label
  // Hinckley is the county's NE corner and lands right under the compass.
  { x1: COMPASS_X - 26, y1: COMPASS_Y - 32, x2: COMPASS_X + 26, y2: COMPASS_Y + 26 },
];

const NODES: PlacedNode[] = (() => {
  const taken: Box[] = [];
  return POSITIONED.map((p) => {
    const pick =
      LABEL_CANDIDATES.find((c) => {
        const b = labelBox(p.x, p.y, p.name, c);
        return !OBSTACLES.some((o) => hits(b, o)) && !taken.some((t) => hits(b, t));
      }) ?? LABEL_CANDIDATES[0];
    taken.push(labelBox(p.x, p.y, p.name, pick));
    return {
      ...p,
      anchor: pick.anchor,
      labelX: px(pick.anchor === "middle" ? p.x : p.x + pick.dx),
      labelY: px(p.y + pick.dy),
    };
  });
})();

/**
 * Build a gentle quadratic-Bezier path between HQ and a community.
 * The curve bows perpendicular to the straight line by a small
 * fraction of that line's length, rotated consistently clockwise so
 * the whole network reads as a unified swirl rather than random bends.
 */
function curvedPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  // Perpendicular offset (rotate dx,dy by 90° clockwise, scale by 0.14)
  const cx = midX + -dy * 0.14;
  const cy = midY + dx * 0.14;
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

/** Orbs share one travel time; staggering by dur/N spaces them evenly. */
const ORB_DUR = 7;

export function MedinaNetworkMap() {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  return (
    <div className="mnm-wrap">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="mnm-svg"
        role="img"
        aria-label={`Stylized map of Medina County showing the Chamber headquarters in downtown Medina connected by flowing paths to ${NODES.length} communities across the county: ${NODES.map((n) => n.name).join(", ")}.`}
      >
        <defs>
          {/* Sparse dot-grid backdrop */}
          <pattern id="mnm-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="rgba(131, 188, 169, 0.14)" />
          </pattern>

          {/* Glow filter for the traveling orbs */}
          <filter id="mnm-orb-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Each community's unique curved path — referenced by its
              orb's <animateMotion> via <mpath>. */}
          {NODES.map((c) => (
            <path key={`def-${c.key}`} id={`mnm-path-${c.key}`} d={curvedPath(HQ_POS, c)} fill="none" />
          ))}
        </defs>

        {/* Layer 0 — ghosted chamber building exterior, behind everything
            else. Grayscale + luminosity blend + low opacity so it reads
            as atmospheric texture, not a literal backdrop photo. */}
        <image
          href="/images/photos/chamber-building-exterior.jpg"
          x="0"
          y="0"
          width={VIEW_W}
          height={VIEW_H}
          preserveAspectRatio="xMidYMid slice"
          className="mnm-photo"
        />

        {/* Layer 1 — dot-grid backdrop */}
        <rect width={VIEW_W} height={VIEW_H} fill="url(#mnm-grid)" />

        {/* Layer 2 — county field. A rounded rectangle around the
            projected bounds, NOT a traced county outline: Medina County
            is a survey-grid county and close to rectangular, so this
            reads as "the county" without pretending to be its true
            border (the previous hand-drawn blob wasn't its shape). */}
        <rect
          x={px(MAP_LEFT - 26)}
          y={MAP_TOP - 20}
          width={px(MAP_W + 52)}
          height={MAP_BOTTOM - MAP_TOP + 40}
          rx="26"
          fill="none"
          stroke="rgba(131, 188, 169, 0.22)"
          strokeWidth="1.2"
          strokeDasharray="2 8"
        />

        {/* Layer 3 — visible connection curves (always drawn) */}
        {NODES.map((c) => {
          const isActive = hoveredKey === c.key;
          return (
            <use
              key={`line-${c.key}`}
              href={`#mnm-path-${c.key}`}
              stroke={isActive ? "#FF4000" : "rgba(131, 188, 169, 0.42)"}
              strokeWidth={isActive ? 1.8 : 1}
              fill="none"
              className="mnm-curve"
            />
          );
        })}

        {/* Layer 4 — traveling orbs (one per connection, evenly staggered) */}
        {NODES.map((c, i) => {
          const begin = `${((i * ORB_DUR) / NODES.length).toFixed(2)}s`;
          return (
            <circle key={`orb-${c.key}`} r={3.5} fill="#FF4000" filter="url(#mnm-orb-glow)" opacity={0} className="mnm-orb">
              <animateMotion
                dur={`${ORB_DUR}s`}
                begin={begin}
                repeatCount="indefinite"
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#mnm-path-${c.key}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.1;0.9;1"
                dur={`${ORB_DUR}s`}
                begin={begin}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {/* Layer 5 — community nodes. Interactivity is intentionally OFF
            for now (map is being redesigned): these are plain <g> groups,
            not links. Hover still highlights the node + its curve. To
            re-enable navigation later, wrap each in an SVG <a> to
            /community/{c.key} with a client-side onClick intercept. */}
        {NODES.map((c) => {
          const isActive = hoveredKey === c.key;
          return (
            <g
              key={`node-${c.key}`}
              className="mnm-node"
              onMouseEnter={() => setHoveredKey(c.key)}
              onMouseLeave={() => setHoveredKey((k) => (k === c.key ? null : k))}
            >
              <title>{c.covers ? `${c.name} (incl. ${c.covers})` : c.name}</title>
              <circle cx={c.x} cy={c.y} r={20} fill="transparent" />
              <circle
                cx={c.x}
                cy={c.y}
                r={7}
                fill="none"
                stroke={isActive ? "#FF4000" : "rgba(131, 188, 169, 0.9)"}
                strokeWidth={1.4}
              />
              <circle cx={c.x} cy={c.y} r={3} fill={isActive ? "#FF4000" : "#83BCA9"} />
              <text
                x={c.labelX}
                y={c.labelY}
                textAnchor={c.anchor}
                className="mnm-label"
                style={{ fill: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.62)" }}
              >
                {c.name}
              </text>
            </g>
          );
        })}

        {/* Layer 6 — HQ (gentle breath). Non-clickable for now; the
            floating address card carries the Get-directions link. */}
        <g className="mnm-hq">
          <circle cx={HQ_POS.x} cy={HQ_POS.y} r={16} className="mnm-hq-breath" fill="rgba(255, 64, 0, 0.22)" />
          <circle cx={HQ_POS.x} cy={HQ_POS.y} r={11} fill="#FF4000" />
          <circle cx={HQ_POS.x} cy={HQ_POS.y} r={4} fill="#FFFFFF" />
          <text x={HQ_POS.x} y={HQ_POS.y - 24} textAnchor="middle" className="mnm-hq-label">
            Chamber HQ
          </text>
        </g>

        {/* Layer 7 — compass, top-right. Registered in OBSTACLES so node
            labels route around it rather than run underneath. */}
        <g className="mnm-compass" transform={`translate(${COMPASS_X} ${COMPASS_Y})`}>
          <circle r="22" fill="rgba(12, 27, 51, 0.5)" stroke="rgba(131, 188, 169, 0.3)" strokeWidth="1" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="rgba(131, 188, 169, 0.5)" strokeWidth="0.8" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="rgba(131, 188, 169, 0.5)" strokeWidth="0.8" />
          <polygon points="0,-16 -4,-6 4,-6" fill="#FF4000" />
          <text x="0" y="-20" textAnchor="middle" className="mnm-compass-label">
            N
          </text>
        </g>
      </svg>
    </div>
  );
}

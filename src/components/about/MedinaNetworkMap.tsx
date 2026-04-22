"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * MedinaNetworkMap — stylized Medina County network.
 *
 * Six member communities around a central HQ, each connected by a
 * gentle curved path. A glowing coquelicot orb rides each curve from
 * HQ outward on a staggered loop, so the connections are always
 * visible AND the network reads as actively flowing.
 *
 * Uses SVG `<animateMotion>` for the orbs — simple, GPU-accelerated,
 * and the orb follows the exact path we've drawn (no drift).
 */

type NodeKey =
  | "hq"
  | "brunswick"
  | "valley-city"
  | "granger"
  | "lafayette"
  | "wadsworth"
  | "rittman"
  | "seville"
  | "lodi";

interface NetworkNode {
  key: NodeKey;
  name: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  dy?: number;
}

/**
 * HQ coordinates are chosen to land on the "MEDINA CHAMBER" logo in
 * the ghosted chamber-building photo behind the map. The photo is
 * `preserveAspectRatio="xMidYMid slice"` so its logo naturally sits
 * around ~y=150 in this 1200×440 viewBox — HQ is anchored there.
 *
 * If this CSS `transform-origin` on `.mnm-hq-breath` is ever updated
 * away from 550px 150px, match it to these constants.
 */
const HQ_X = 550;
const HQ_Y = 150;

const HQ: NetworkNode = { key: "hq", name: "Chamber HQ", x: HQ_X, y: HQ_Y, anchor: "middle" };

/**
 * Eight nodes, mapped 1:1 with the chamber's official service areas
 * (Brunswick, Valley City, Granger, Lafayette, Wadsworth, Rittman,
 * Seville, Lodi). Placement follows real-world compass bearing from
 * the HQ in downtown Medina.
 *
 * Service-area absorptions — some townships share dots with adjacent
 * cities so the map reads as geography rather than administrative
 * boundaries:
 *   • HQ dot  covers Medina city + Medina Township + Montville Township
 *     (Montville wraps Medina on three sides — same footprint).
 *   • Brunswick dot covers Brunswick city + Brunswick Hills Township
 *     (Hills is the unincorporated ring around the city).
 *
 * The dedicated /community pages for Montville, Granger, and Lafayette
 * all render on hit — the empty-state template was wired up earlier.
 */
const COMMUNITIES: NetworkNode[] = [
  { key: "brunswick",   name: "Brunswick",    x: 890, y: 50,  anchor: "start",  dy: -10 }, // NE  (incl. Brunswick Hills Twp)
  { key: "valley-city", name: "Valley City",  x: 700, y: 80,  anchor: "middle", dy: -16 }, // N
  { key: "granger",     name: "Granger Twp",  x: 830, y: 150, anchor: "start",  dy: -14 }, // E   (between HQ and Brunswick)
  { key: "lafayette",   name: "Lafayette",    x: 680, y: 270, anchor: "start",  dy: -14 }, // SE  (just S of HQ, E of Seville)
  { key: "wadsworth",   name: "Wadsworth",    x: 920, y: 320, anchor: "start",  dy: 18 },  // SE
  { key: "rittman",     name: "Rittman",      x: 840, y: 400, anchor: "start",  dy: 20 },  // S/SE
  { key: "seville",     name: "Seville",      x: 470, y: 390, anchor: "middle", dy: 26 },  // S   (moved left to open room for Lafayette)
  { key: "lodi",        name: "Lodi",         x: 220, y: 370, anchor: "end",    dy: 24 },  // SW
];

const GMAPS_URL =
  "https://maps.google.com/?q=139+N+Court+Street+Suite+A+Medina+OH+44256";

/**
 * Build a gentle quadratic-Bezier path between HQ and a community.
 * The curve bows perpendicular to the straight line by a small
 * fraction of that line's length, rotated consistently clockwise so
 * the whole network reads as a unified swirl rather than random bends.
 */
function curvedPath(from: NetworkNode, to: NetworkNode): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  // Perpendicular offset (rotate dx,dy by 90° clockwise, scale by 0.18)
  const perpX = -dy * 0.18;
  const perpY = dx * 0.18;
  const cx = midX + perpX;
  const cy = midY + perpY;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

export function MedinaNetworkMap() {
  const [hoveredKey, setHoveredKey] = useState<NodeKey | null>(null);
  const router = useRouter();

  // Warm the community route on hover so the click lands on an already
  // prefetched page — Next.js Link does this automatically, but here
  // we're driving navigation imperatively from an SVG <a> intercept.
  const prefetchCommunity = (key: NodeKey) => {
    router.prefetch(`/community/${key}`);
  };

  return (
    <div className="mnm-wrap">
      <svg
        viewBox="0 0 1200 440"
        preserveAspectRatio="xMidYMid meet"
        className="mnm-svg"
        role="img"
        aria-label="Stylized map of Medina County showing the Chamber headquarters connected by flowing paths to six member communities: Brunswick, Valley City, Wadsworth, Rittman, Seville, and Lodi"
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
          {COMMUNITIES.map((c) => (
            <path
              key={`def-${c.key}`}
              id={`mnm-path-${c.key}`}
              d={curvedPath(HQ, c)}
              fill="none"
            />
          ))}
        </defs>

        {/* Layer 0 — ghosted chamber building exterior, behind everything
            else. Grayscale + luminosity blend + low opacity so it reads
            as atmospheric texture, not a literal backdrop photo. */}
        <image
          href="/images/photos/chamber-building-exterior.jpg"
          x="0"
          y="0"
          width="1200"
          height="440"
          preserveAspectRatio="xMidYMid slice"
          className="mnm-photo"
        />

        {/* Layer 1 — dot-grid backdrop */}
        <rect width="1200" height="440" fill="url(#mnm-grid)" />

        {/* Layer 2 — loose county reference ring */}
        <path
          d="M 100 120 Q 260 40 540 50 Q 830 40 1080 110 Q 1130 220 1080 340 Q 980 410 700 410 Q 380 420 200 360 Q 80 270 100 120 Z"
          fill="none"
          stroke="rgba(131, 188, 169, 0.22)"
          strokeWidth="1.2"
          strokeDasharray="2 8"
        />

        {/* Layer 3 — visible connection curves (always drawn) */}
        {COMMUNITIES.map((c) => {
          const isActive = hoveredKey === c.key;
          return (
            <use
              key={`line-${c.key}`}
              href={`#mnm-path-${c.key}`}
              stroke={isActive ? "#FF4000" : "rgba(131, 188, 169, 0.48)"}
              strokeWidth={isActive ? 1.8 : 1.2}
              fill="none"
              className="mnm-curve"
            />
          );
        })}

        {/* Layer 4 — traveling orbs (one per connection, staggered) */}
        {COMMUNITIES.map((c, i) => (
          <circle
            key={`orb-${c.key}`}
            r={4}
            fill="#FF4000"
            filter="url(#mnm-orb-glow)"
            opacity={0}
            className="mnm-orb"
          >
            <animateMotion
              dur="6s"
              begin={`${i * 1}s`}
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
              dur="6s"
              begin={`${i * 1}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Layer 5 — community nodes. Each one links to its city
            landing page (/community/{slug}) so clicking Brunswick
            pulls up Brunswick's members, categories, and events.
            Uses an SVG <a> so it's a real anchor (right-click → open
            in new tab, middle-click, keyboard focus all work), with
            an onClick intercept to get client-side navigation and
            avoid a full page reload. */}
        {COMMUNITIES.map((c) => {
          const isActive = hoveredKey === c.key;
          const href = `/community/${c.key}`;
          return (
            <a
              key={`node-${c.key}`}
              href={href}
              aria-label={`View ${c.name} chamber members and community resources`}
              onClick={(e) => {
                // Let modified clicks (cmd/ctrl/shift/middle) fall
                // through to the browser's default new-tab/new-window
                // behavior — only intercept plain left-clicks.
                if (
                  e.button === 0 &&
                  !e.metaKey &&
                  !e.ctrlKey &&
                  !e.shiftKey &&
                  !e.altKey
                ) {
                  e.preventDefault();
                  router.push(href);
                }
              }}
              onMouseEnter={() => {
                setHoveredKey(c.key);
                prefetchCommunity(c.key);
              }}
              onMouseLeave={() => setHoveredKey((k) => (k === c.key ? null : k))}
              onFocus={() => {
                setHoveredKey(c.key);
                prefetchCommunity(c.key);
              }}
              onBlur={() => setHoveredKey((k) => (k === c.key ? null : k))}
            >
              <g className="mnm-node">
                <circle cx={c.x} cy={c.y} r={22} fill="transparent" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={7}
                  fill="none"
                  stroke={isActive ? "#FF4000" : "rgba(131, 188, 169, 0.75)"}
                  strokeWidth={1.4}
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={3}
                  fill={isActive ? "#FF4000" : "#83BCA9"}
                />
                <text
                  x={c.x + (c.anchor === "end" ? -12 : c.anchor === "start" ? 12 : 0)}
                  y={c.y + (c.dy ?? 0)}
                  textAnchor={c.anchor}
                  className="mnm-label"
                  style={{ fill: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.62)" }}
                >
                  {c.name}
                </text>
              </g>
            </a>
          );
        })}

        {/* Layer 6 — HQ (clickable, gentle breath) */}
        <a
          href={GMAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Chamber headquarters address in Google Maps for directions"
        >
          <g className="mnm-hq">
            <circle
              cx={HQ.x}
              cy={HQ.y}
              r={14}
              className="mnm-hq-breath"
              fill="rgba(255, 64, 0, 0.22)"
            />
            <circle cx={HQ.x} cy={HQ.y} r={10} fill="#FF4000" />
            <circle cx={HQ.x} cy={HQ.y} r={4}  fill="#FFFFFF" />
            <text
              x={HQ.x}
              y={HQ.y + 34}
              textAnchor="middle"
              className="mnm-hq-label"
            >
              Chamber HQ
            </text>
          </g>
        </a>

        {/* Layer 7 — compass (decorative, for directional context) */}
        <g className="mnm-compass" transform="translate(60 60)">
          <circle r="22" fill="rgba(12, 27, 51, 0.5)" stroke="rgba(131, 188, 169, 0.3)" strokeWidth="1" />
          <line x1="0" y1="-14" x2="0" y2="14" stroke="rgba(131, 188, 169, 0.5)" strokeWidth="0.8" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="rgba(131, 188, 169, 0.5)" strokeWidth="0.8" />
          <polygon points="0,-16 -4,-6 4,-6" fill="#FF4000" />
          <text x="0" y="-20" textAnchor="middle" className="mnm-compass-label">N</text>
        </g>
      </svg>
    </div>
  );
}

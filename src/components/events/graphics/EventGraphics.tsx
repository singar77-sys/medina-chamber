/**
 * Event Graphics — eleven chamber-event social graphics, each renderable
 * at three canvas sizes: social (1200×630), square (1080×1080), story
 * (1080×1920).
 *
 * Shared primitives (types, brand hex, asset URLs, pick helper, container
 * styles, FONT/SCRIPT stacks) live in ./shared. The <GraphicFrame/>
 * scaler is in ./GraphicFrame. Event routing + the EVENT_GRAPHICS
 * registry are in ./registry. This file is just the eleven graphic
 * component implementations.
 */

import type { CSSProperties } from "react";
import {
  BRAND,
  ASSETS,
  FONT_STACK,
  SCRIPT_STACK,
  containerStyle,
  svgFillStyle,
  pick,
  type EventInfo,
  type GraphicMode,
} from "./shared";

/* =============================================================================
   1 — NETWORKING WOW  (redesign v2 — esoteric chamber-faithful)

   Layered composition:
     • Oxford blue field
     • Hexagonal honeycomb grid at low opacity (chamber as society)
     • 12-node ring with full all-to-all connection web (the literal
       "network", also reads as a hermetic seal / fraternal compass)
     • Three concentric ghost rings (radial seal feel)
     • Coquelicot radial glow centered on the title
     • BN Bergen "Networking" / "WOW!" wordmark
     • Mistrully script accent on "Opportunities" in the chamber's
       actual tagline ("Watch Opportunities Work")
     • Optional event-info plinth at the bottom (date · time + a
       "REGISTRATION REQUIRED" note) when an EventInfo is supplied —
       generic preview omits it so the template still works for any
       month's instance.
   ============================================================================ */

export function NetworkingWowGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleTop = pick([180, 132, 170] as const, mode);
  const titleBig = pick([260, 220, 300] as const, mode);

  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;
  const vb = `0 0 ${W} ${H}`;

  // Sacred-geometry "network web" placement — anchored opposite the
  // title block in each layout so it never collides with type.
  const seal = isStory
    ? { cx: 540, cy: 620, r: 320 }
    : isSquare
    ? { cx: 760, cy: 540, r: 320 }
    : { cx: 880, cy: 315, r: 240 };

  // 12 nodes around the seal — connect every pair to form the
  // complete graph K_12 (66 edges). Reads as both "networking" and
  // a hermetic seal / society compass.
  const nodes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return { x: seal.cx + Math.cos(a) * seal.r, y: seal.cy + Math.sin(a) * seal.r };
  });
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) edges.push([i, j]);
  }

  // Tagline geometry (sits under the WOW! mark)
  const taglineSize = pick([34, 40, 52] as const, mode);
  const scriptSize = pick([56, 70, 92] as const, mode);

  // Bottom info plinth heights
  const plinthGap = pick([18, 22, 28] as const, mode);
  const plinthLabel = pick([18, 22, 28] as const, mode);
  const plinthBig = pick([28, 34, 40] as const, mode);

  // Date string for the plinth, e.g. "WED · MAY 20, 2026"
  const dateLine = eventInfo
    ? [
        eventInfo.dayOfWeek?.substring(0, 3).toUpperCase(),
        eventInfo.month && eventInfo.day
          ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          {/* Coquelicot wash under the wordmark — toned way down (was
              0.55 → felt like an abrasive orange spotlight against the
              already-saturated WOW! mark). 0.22 reads as warmth, not
              heat, with a soft midpoint to smooth the falloff. */}
          <radialGradient id={`nwglow-${mode}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BRAND.coquelicot} stopOpacity="0.22" />
            <stop offset="40%" stopColor={BRAND.coquelicot} stopOpacity="0.08" />
            <stop offset="80%" stopColor={BRAND.coquelicot} stopOpacity="0" />
          </radialGradient>
          {/* Honeycomb grid — hexagons via two offset diagonal repeats */}
          <pattern id={`nwhex-${mode}`} x="0" y="0" width="64" height="56" patternUnits="userSpaceOnUse">
            <path
              d="M 32 0 L 64 16 L 64 40 L 32 56 L 0 40 L 0 16 Z"
              fill="none"
              stroke={BRAND.cambridge}
              strokeOpacity="0.07"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Honeycomb texture across the full field */}
        <rect width="100%" height="100%" fill={`url(#nwhex-${mode})`} />

        {/* Glow halo behind the WOW! mark — anchored to the title side */}
        <g>
          <circle
            cx={isStory ? 380 : isSquare ? 360 : 420}
            cy={isStory ? 1280 : isSquare ? 720 : 380}
            r={isStory ? 480 : 360}
            fill={`url(#nwglow-${mode})`}
          />
        </g>

        {/* Sacred-geometry seal — three concentric ghost rings */}
        <g opacity="0.32">
          <circle cx={seal.cx} cy={seal.cy} r={seal.r * 1.18} fill="none" stroke={BRAND.cambridge} strokeWidth="1.5" strokeDasharray="1 5" />
          <circle cx={seal.cx} cy={seal.cy} r={seal.r * 1.06} fill="none" stroke={BRAND.cambridge} strokeWidth="1.2" />
          <circle cx={seal.cx} cy={seal.cy} r={seal.r * 0.92} fill="none" stroke={BRAND.cambridge} strokeWidth="1" strokeDasharray="2 8" />
        </g>

        {/* Complete-graph K_12 connection web */}
        <g stroke={BRAND.cambridge} strokeOpacity="0.22" strokeWidth="1">
          {edges.map(([a, b], i) => (
            <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
          ))}
        </g>

        {/* Outer ring */}
        <circle cx={seal.cx} cy={seal.cy} r={seal.r} fill="none" stroke={BRAND.cambridge} strokeOpacity="0.55" strokeWidth="1.5" />

        {/* 12 nodes — alternating coquelicot accent at cardinal positions */}
        {nodes.map((n, i) => {
          const cardinal = i % 3 === 0;
          return (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={cardinal ? 8 : 5} fill={cardinal ? BRAND.coquelicot : BRAND.cambridge} />
              {cardinal && (
                <circle cx={n.x} cy={n.y} r={16} fill="none" stroke={BRAND.coquelicot} strokeOpacity="0.4" strokeWidth="1.5" />
              )}
            </g>
          );
        })}

        {/* Center mark — small coquelicot dot + cambridge ring */}
        <circle cx={seal.cx} cy={seal.cy} r="6" fill={BRAND.coquelicot} />
        <circle cx={seal.cx} cy={seal.cy} r="14" fill="none" stroke={BRAND.cambridge} strokeOpacity="0.5" strokeWidth="1" />
      </svg>

      {/* Content layer */}
      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding: isStory ? "72px 72px 84px" : isSquare ? "56px 64px 64px" : "44px 64px 52px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Top rail — chamber wordmark left, icon right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: pick([14, 16, 20] as const, mode),
            fontWeight: 700, letterSpacing: "0.18em",
            color: BRAND.cambridge, textTransform: "uppercase",
          }}>
            Greater Medina Chamber
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44, opacity: 0.95 }} alt="" />
        </div>

        {/* Title + tagline block */}
        <div style={{ marginTop: isStory ? -120 : 0 }}>
          <div style={{
            fontSize: titleTop, fontWeight: 700, lineHeight: 0.82,
            letterSpacing: "-0.05em", color: "#fff",
          }}>
            Networking
          </div>
          <div style={{
            fontSize: titleBig, fontWeight: 700, lineHeight: 0.82,
            letterSpacing: "-0.06em", color: BRAND.coquelicot,
            marginTop: -20, marginLeft: -8,
          }}>
            WOW!
          </div>

          {/* Tagline — BN Bergen "Watch ___ Work" with Mistrully on
              "Opportunities" as a single-word brand accent. */}
          <div style={{
            marginTop: isStory ? 32 : 18,
            display: "flex", alignItems: "baseline", flexWrap: "wrap",
            columnGap: pick([14, 16, 20] as const, mode),
            rowGap: 4,
            color: "#fff",
          }}>
            <span style={{
              fontSize: taglineSize, fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Watch</span>
            <span style={{
              fontFamily: SCRIPT_STACK,
              fontSize: scriptSize, lineHeight: 0.9,
              color: BRAND.cambridge, fontWeight: 400,
              transform: "translateY(0.08em)", display: "inline-block",
            }}>
              Opportunities
            </span>
            <span style={{
              fontSize: taglineSize, fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Work</span>
          </div>
        </div>

        {/* Bottom event-info plinth — only renders when bound to a
            specific upcoming event. The generic template stays clean. */}
        {eventInfo && (dateLine || eventInfo.time || eventInfo.note) && (
          <div style={{
            borderTop: `1px solid ${BRAND.cambridge}55`,
            paddingTop: plinthGap,
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 24, flexWrap: "wrap",
          }}>
            <div>
              {dateLine && (
                <div style={{
                  fontSize: plinthLabel, fontWeight: 700,
                  letterSpacing: "0.16em", color: BRAND.cambridge,
                  textTransform: "uppercase",
                }}>
                  {dateLine}
                </div>
              )}
              {eventInfo.time && (
                <div style={{
                  fontSize: plinthBig, fontWeight: 700,
                  color: "#fff", letterSpacing: "-0.01em", marginTop: 4,
                }}>
                  {eventInfo.time}
                </div>
              )}
            </div>
            {eventInfo.note && (
              <div style={{
                fontSize: plinthLabel, fontWeight: 700,
                letterSpacing: "0.18em", color: BRAND.coquelicot,
                textTransform: "uppercase", textAlign: "right",
                paddingBottom: 4,
              }}>
                {eventInfo.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   2 — SAFETY COUNCIL  (redesign v2 — esoteric chamber-faithful)

   Sacred geometry: Metatron's Cube — the alchemical / hermetic symbol of
   protection (13 circles in Fruit-of-Life arrangement, all centers
   connected, projects the five Platonic solids). Different shape system
   than Networking WOW's K_12 web; same compositional grammar (top rail,
   title, three-word Mistrully tagline, optional event-info plinth).

   Palette stays emerald + cambridge with a thin coquelicot hazard
   accent, but the chunky safety stripe is replaced with a single
   diagonal corner pennant — more design, less construction-zone.
   ============================================================================ */

export function SafetyCouncilGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([180, 220, 260] as const, mode);

  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;
  const vb = `0 0 ${W} ${H}`;

  // Metatron's Cube anchor — opposite the title block in each layout.
  const seal = isStory
    ? { cx: 540, cy: 600, r: 280 }
    : isSquare
    ? { cx: 770, cy: 540, r: 280 }
    : { cx: 880, cy: 315, r: 220 };

  // The 13 Fruit-of-Life centers: one at the middle, six in an inner
  // hexagon at radius r/2, six in an outer hexagon at radius r.
  const centers: Array<{ x: number; y: number; ring: 0 | 1 | 2 }> = [
    { x: seal.cx, y: seal.cy, ring: 0 },
  ];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    centers.push({ x: seal.cx + Math.cos(a) * (seal.r / 2), y: seal.cy + Math.sin(a) * (seal.r / 2), ring: 1 });
    centers.push({ x: seal.cx + Math.cos(a) * seal.r, y: seal.cy + Math.sin(a) * seal.r, ring: 2 });
  }
  // Edges between every pair of centers — the cube projection itself.
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < centers.length; i++) {
    for (let j = i + 1; j < centers.length; j++) edges.push([i, j]);
  }
  const circleR = pick([10, 12, 14] as const, mode);

  // Tagline geometry
  const taglineSize = pick([34, 40, 52] as const, mode);
  const scriptSize = pick([56, 70, 92] as const, mode);

  // Bottom info plinth
  const plinthGap = pick([18, 22, 28] as const, mode);
  const plinthLabel = pick([18, 22, 28] as const, mode);
  const plinthBig = pick([28, 34, 40] as const, mode);

  const dateLine = eventInfo
    ? [
        eventInfo.dayOfWeek?.substring(0, 3).toUpperCase(),
        eventInfo.month && eventInfo.day
          ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div style={containerStyle({ background: BRAND.emerald, color: "#fff" })}>
      {/* Single diagonal coquelicot pennant — the safety/hazard cue,
          dialed back from the previous full-stripe to a corner accent. */}
      <div style={{
        position: "absolute",
        top: -20, right: -60,
        width: isStory ? 220 : 180, height: 36,
        background: BRAND.coquelicot,
        transform: "rotate(45deg)",
        transformOrigin: "top right",
      }} />
      <div style={{
        position: "absolute",
        top: 26, right: -60,
        width: isStory ? 220 : 180, height: 8,
        background: BRAND.oxford,
        transform: "rotate(45deg)",
        transformOrigin: "top right",
        opacity: 0.85,
      }} />

      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          <radialGradient id={`scglow-${mode}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BRAND.cambridge} stopOpacity="0.35" />
            <stop offset="70%" stopColor={BRAND.cambridge} stopOpacity="0" />
          </radialGradient>
          {/* Subtle dot lattice across the field — different texture
              than the Networking WOW honeycomb so the two graphics
              read as siblings, not twins. */}
          <pattern id={`scdots-${mode}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={BRAND.cambridge} opacity="0.10" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill={`url(#scdots-${mode})`} />

        {/* Cambridge glow halo behind the cube */}
        <circle cx={seal.cx} cy={seal.cy} r={seal.r * 1.4} fill={`url(#scglow-${mode})`} />

        {/* Outer perimeter circle (the seal boundary) */}
        <circle cx={seal.cx} cy={seal.cy} r={seal.r * 1.05} fill="none" stroke={BRAND.cambridge} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="2 6" />

        {/* The 13 Fruit-of-Life circles, drawn empty for the lattice */}
        <g fill="none" stroke={BRAND.cambridge} strokeOpacity="0.35" strokeWidth="1.2">
          {centers.map((c, i) => (
            <circle key={`fol-${i}`} cx={c.x} cy={c.y} r={seal.r / 2} />
          ))}
        </g>

        {/* Metatron's Cube — connect every pair of centers */}
        <g stroke={BRAND.cambridge} strokeOpacity="0.5" strokeWidth="1.1">
          {edges.map(([a, b], i) => (
            <line key={i} x1={centers[a].x} y1={centers[a].y} x2={centers[b].x} y2={centers[b].y} />
          ))}
        </g>

        {/* The 13 nodes themselves — outer ring uses coquelicot,
            inner ring cambridge, center filled coquelicot */}
        {centers.map((c, i) => {
          const fill =
            c.ring === 0
              ? BRAND.coquelicot
              : c.ring === 1
              ? BRAND.cambridge
              : "#fff";
          const r = c.ring === 0 ? circleR + 3 : circleR;
          return (
            <g key={`node-${i}`}>
              <circle cx={c.x} cy={c.y} r={r} fill={fill} />
              {c.ring === 0 && (
                <circle cx={c.x} cy={c.y} r={r + 8} fill="none" stroke={BRAND.coquelicot} strokeOpacity="0.5" strokeWidth="2" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Content layer */}
      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding: isStory ? "72px 72px 84px" : isSquare ? "56px 64px 64px" : "44px 64px 52px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Top rail — chamber wordmark left, icon right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: pick([14, 16, 20] as const, mode),
            fontWeight: 700, letterSpacing: "0.18em",
            color: BRAND.cambridge, textTransform: "uppercase",
          }}>
            Greater Medina Chamber
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44, opacity: 0.9 }} alt="" />
        </div>

        {/* Title + tagline block */}
        <div style={{ marginTop: isStory ? -120 : 0 }}>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.82,
            letterSpacing: "-0.045em", color: "#fff",
          }}>
            Safety
          </div>
          <div style={{
            fontSize: titleSize, fontWeight: 300, lineHeight: 0.82,
            letterSpacing: "-0.04em", color: BRAND.cambridge, fontStyle: "italic",
          }}>
            Council
          </div>

          {/* Tagline — TRAIN · _Together_ · PREVENT */}
          <div style={{
            marginTop: isStory ? 32 : 18,
            display: "flex", alignItems: "baseline", flexWrap: "wrap",
            columnGap: pick([14, 16, 20] as const, mode),
            rowGap: 4,
            color: "#fff",
          }}>
            <span style={{
              fontSize: taglineSize, fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Train</span>
            <span style={{
              fontFamily: SCRIPT_STACK,
              fontSize: scriptSize, lineHeight: 0.9,
              color: BRAND.cambridge, fontWeight: 400,
              transform: "translateY(0.08em)", display: "inline-block",
            }}>
              Together
            </span>
            <span style={{
              fontSize: taglineSize, fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Prevent</span>
          </div>
        </div>

        {/* Bottom event-info plinth — only when bound to a specific
            upcoming event. */}
        {eventInfo && (dateLine || eventInfo.time || eventInfo.note) && (
          <div style={{
            borderTop: `1px solid ${BRAND.cambridge}55`,
            paddingTop: plinthGap,
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 24, flexWrap: "wrap",
          }}>
            <div>
              {dateLine && (
                <div style={{
                  fontSize: plinthLabel, fontWeight: 700,
                  letterSpacing: "0.16em", color: BRAND.cambridge,
                  textTransform: "uppercase",
                }}>
                  {dateLine}
                </div>
              )}
              {eventInfo.time && (
                <div style={{
                  fontSize: plinthBig, fontWeight: 700,
                  color: "#fff", letterSpacing: "-0.01em", marginTop: 4,
                }}>
                  {eventInfo.time}
                </div>
              )}
            </div>
            {eventInfo.note && (
              <div style={{
                fontSize: plinthLabel, fontWeight: 700,
                letterSpacing: "0.18em", color: BRAND.coquelicot,
                textTransform: "uppercase", textAlign: "right",
                paddingBottom: 4,
              }}>
                {eventInfo.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   3 — CHAMBER CHAT  (redesign v2)
   Oxford field with a ghosted networking photo + linear darken gradient,
   cambridge coffee cup and steam swirls, split-color title stack,
   coquelicot-accented "WHEN" stat.
   ============================================================================ */

export function ChamberChatGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";

  // Cup position is aspect-specific: wide layouts (social, square) put
  // the cup on the right and the title on the left. Story is portrait —
  // the title sits at the bottom, so the cup goes up top so they don't
  // collide. Centered horizontally for a symmetric vertical composition.
  //
  // Story cup needed to move up ~280px (760 → 480) because the new
  // title-block height (title + tagline + plinth ≈ 700px) was leaving
  // only ~2px between the saucer bottom and the title top — they were
  // effectively touching. Also slimmed h slightly so the saucer bottom
  // lands ~y=820 in story, well above the y=1120 title top.
  const cup = isStory
    ? { cx: 540, cy: 480,  rx: 230, ry: 58, h: 250 }
    : isSquare
    ? { cx: 820, cy: 600,  rx: 200, ry: 50, h: 220 }
    : { cx: 980, cy: 320,  rx: 160, ry: 40, h: 180 };

  // BN Bergen bold "Chamber" at 260px measures ~1106px wide — wider than
  // the 1080 story canvas, so the final "r" would render past the right
  // edge. Dropped story size to 230, which puts "Chamber" around 980px
  // and leaves a ~30px safety margin inside the canvas. Social/square
  // values unchanged — they had plenty of horizontal room already.
  const titleSize = pick([140, 200, 230] as const, mode);
  const padding = isStory ? "110px 72px 100px" : isSquare ? "72px 64px" : "56px 64px";

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      {/* Ghosted networking photo */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url(${ASSETS.networking})`,
        backgroundSize: "cover", backgroundPosition: "center",
        opacity: 0.32, mixBlendMode: "luminosity",
        filter: "grayscale(1) contrast(1.1)",
      }} />
      {/* Darken gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(180deg, ${BRAND.oxford}99 0%, ${BRAND.oxford}cc 55%, ${BRAND.oxford}f2 100%)`,
      }} />

      {/* Coffee cup illustration — cambridge palette */}
      <svg viewBox={vb} style={svgFillStyle}>
        {/* Steam swirls */}
        <g opacity="0.5" fill="none" stroke={BRAND.cambridge} strokeWidth={isStory ? 4 : 3} strokeLinecap="round">
          {[0, 1, 2].map((i) => {
            const x = cup.cx + (i - 1) * (cup.rx * 0.45);
            const topY = cup.cy - cup.ry - (isStory ? 260 : 180);
            const botY = cup.cy - cup.ry - 12;
            const midX = x + (i % 2 === 0 ? 20 : -20);
            return (
              <path
                key={i}
                d={`M ${x} ${botY} C ${midX} ${botY - 50}, ${x + 28} ${botY - 100}, ${x - 10} ${botY - 150} S ${midX + 14} ${topY + 30}, ${x} ${topY}`}
              />
            );
          })}
        </g>

        {/* Saucer — three rings */}
        <ellipse cx={cup.cx} cy={cup.cy + cup.h + 16} rx={cup.rx + 36} ry={cup.ry * 0.8}  fill={BRAND.cambridge} opacity="0.22" />
        <ellipse cx={cup.cx} cy={cup.cy + cup.h + 10} rx={cup.rx + 30} ry={cup.ry * 0.7}  fill={BRAND.cambridge} />
        <ellipse cx={cup.cx} cy={cup.cy + cup.h + 6}  rx={cup.rx + 22} ry={cup.ry * 0.55} fill={BRAND.oxford} />

        {/* Cup body — tapered */}
        <path
          d={`M ${cup.cx - cup.rx} ${cup.cy}
              C ${cup.cx - cup.rx} ${cup.cy + cup.h * 0.8}, ${cup.cx - cup.rx * 0.6} ${cup.cy + cup.h}, ${cup.cx} ${cup.cy + cup.h}
              C ${cup.cx + cup.rx * 0.6} ${cup.cy + cup.h}, ${cup.cx + cup.rx} ${cup.cy + cup.h * 0.8}, ${cup.cx + cup.rx} ${cup.cy}
              Z`}
          fill={BRAND.cambridge}
        />

        {/* Handle */}
        <path
          d={`M ${cup.cx + cup.rx - 4} ${cup.cy + cup.h * 0.2}
              Q ${cup.cx + cup.rx + cup.rx * 0.55} ${cup.cy + cup.h * 0.35}, ${cup.cx + cup.rx + cup.rx * 0.55} ${cup.cy + cup.h * 0.55}
              Q ${cup.cx + cup.rx + cup.rx * 0.55} ${cup.cy + cup.h * 0.78}, ${cup.cx + cup.rx - 4} ${cup.cy + cup.h * 0.72}`}
          fill="none"
          stroke={BRAND.cambridge}
          strokeWidth={isStory ? 28 : 22}
          strokeLinecap="round"
        />

        {/* Coffee surface */}
        <ellipse cx={cup.cx} cy={cup.cy} rx={cup.rx}      ry={cup.ry}      fill={BRAND.oxford} />
        <ellipse cx={cup.cx} cy={cup.cy} rx={cup.rx - 10} ry={cup.ry - 8}  fill="#1a1306" />
        <ellipse cx={cup.cx - cup.rx * 0.3} cy={cup.cy - cup.ry * 0.3} rx={cup.rx * 0.45} ry={cup.ry * 0.25} fill="rgba(255,255,255,0.06)" />

        {/* Coquelicot accent dot */}
        <circle cx={cup.cx + cup.rx * 0.35} cy={cup.cy + 2} r={isStory ? 10 : 7} fill={BRAND.coquelicot} opacity="0.95" />
      </svg>

      {/* Content layer */}
      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Top rail — chamber wordmark left, icon right (matches the
            grammar established by Networking WOW + Safety Council v2) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: pick([14, 16, 20] as const, mode),
            fontWeight: 700, letterSpacing: "0.18em",
            color: BRAND.cambridge, textTransform: "uppercase",
          }}>
            Greater Medina Chamber
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44 }} alt="" />
        </div>

        <div style={{ maxWidth: isStory ? 960 : isSquare ? 620 : 640 }}>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.86, letterSpacing: "-0.045em", color: "#fff" }}>
            Chamber
          </div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.86, letterSpacing: "-0.045em", color: BRAND.cambridge, marginTop: -8 }}>
            Chat
          </div>

          {/* Chamber's actual slogan: "Where Connections Happen" —
              Mistrully on "Connections" (the relationship word). */}
          <div style={{
            marginTop: isStory ? 28 : 16,
            display: "flex", alignItems: "baseline", flexWrap: "wrap",
            columnGap: pick([12, 14, 18] as const, mode),
            rowGap: 4,
            color: "#fff",
          }}>
            <span style={{
              fontSize: pick([28, 36, 48] as const, mode), fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Where</span>
            <span style={{
              fontFamily: SCRIPT_STACK,
              fontSize: pick([46, 60, 80] as const, mode), lineHeight: 0.9,
              color: BRAND.cambridge, fontWeight: 400,
              transform: "translateY(0.08em)", display: "inline-block",
            }}>
              Connections
            </span>
            <span style={{
              fontSize: pick([28, 36, 48] as const, mode), fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Happen</span>
          </div>
        </div>

        {/* Bottom event-info plinth — only when bound to a specific
            upcoming event. */}
        {eventInfo && (eventInfo.dayOfWeek || eventInfo.time || eventInfo.note) && (
          <div style={{
            borderTop: `1px solid ${BRAND.cambridge}55`,
            paddingTop: pick([18, 22, 28] as const, mode),
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 24, flexWrap: "wrap",
          }}>
            <div>
              {(() => {
                const dateLine = [
                  eventInfo.dayOfWeek?.substring(0, 3).toUpperCase(),
                  eventInfo.month && eventInfo.day
                    ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return dateLine ? (
                  <div style={{
                    fontSize: pick([18, 22, 28] as const, mode), fontWeight: 700,
                    letterSpacing: "0.16em", color: BRAND.cambridge,
                    textTransform: "uppercase",
                  }}>
                    {dateLine}
                  </div>
                ) : null;
              })()}
              {eventInfo.time && (
                <div style={{
                  fontSize: pick([28, 34, 40] as const, mode), fontWeight: 700,
                  color: "#fff", letterSpacing: "-0.01em", marginTop: 4,
                }}>
                  {eventInfo.time}
                </div>
              )}
            </div>
            {eventInfo.note && (
              <div style={{
                fontSize: pick([18, 22, 28] as const, mode), fontWeight: 700,
                letterSpacing: "0.18em", color: BRAND.coquelicot,
                textTransform: "uppercase", textAlign: "right",
                paddingBottom: 4,
              }}>
                {eventInfo.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   4 — MEMBER MEETING
   Paper field, dotted pattern, concentric emerald circles, italic headline.
   ============================================================================ */

export function MemberMeetingGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";
  const titleSize = pick([150, 180, 220] as const, mode);

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const focusTranslate = isStory ? "translate(540, 1500)" : isSquare ? "translate(820, 820)" : "translate(1000, 315)";

  return (
    <div style={containerStyle({ background: BRAND.paper, color: BRAND.oxford })}>
      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          <pattern id={`mmdots-${mode}`} x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill={BRAND.cambridge} opacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#mmdots-${mode})`} />
        <g transform={focusTranslate}>
          <circle r={isStory ? 340 : 240} fill={BRAND.emerald} opacity="0.08" />
          <circle r={isStory ? 260 : 180} fill={BRAND.emerald} opacity="0.14" />
          <circle r={isStory ? 180 : 120} fill={BRAND.emerald} opacity="0.22" />
          <circle r={isStory ? 96 : 64}  fill={BRAND.coquelicot} />
        </g>
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "110px 72px 80px" : "64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconOrange} style={{ height: isStory ? 60 : 44 }} alt="" />
        </div>

        <div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.88, letterSpacing: "-0.04em", color: BRAND.oxford }}>
            Member
          </div>
          <div style={{ fontSize: titleSize, fontWeight: 300, lineHeight: 0.88, letterSpacing: "-0.035em", color: BRAND.emerald, fontStyle: "italic" }}>
            Meeting
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   5 — GOLF OUTING  (John Alvin pass)

   Cinematic poster, not yard-sign clip-art. The chamber's annual golf
   outing isn't a tournament — it's the summer ritual where Medina
   business gets done in the open air, thirty-eight years running.
   The poster captures the moment the day exhales.

   Single symbolic image: a lone flag on the horizon at sunset.
   Sky carries the whole emotional load — a vertical gradient from
   twilight oxford navy at the top through cambridge teal residue
   to a luminous coquelicot-amber band at the horizon. Two layered
   hill silhouettes in atmospheric perspective. Single bird overhead.
   A radial halo bloom around the pin — the Alvin luminous focal.

   Type as cinema credits, not data UI. No standard plinth. The
   icon moves to the credit row at the very bottom where studio
   marks live on movie posters.
   ============================================================================ */

export function GolfOutingGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;
  const vb = `0 0 ${W} ${H}`;

  // Horizon line — where sky meets the dark crest. Set high enough to
  // give the sky 60-70% of the canvas (the sky is the hero).
  const horizonY = isStory ? Math.round(H * 0.62) : isSquare ? Math.round(H * 0.65) : Math.round(H * 0.66);

  // Flag pole — sits on the horizon. Rises about 35-40% of the canvas
  // height up into the sky. Positioned slightly off-center for
  // asymmetric balance against the type.
  const poleX = isStory ? 540 : isSquare ? 660 : 820;
  const poleBottomY = horizonY - 4;
  const poleTopY = horizonY - Math.round(H * (isStory ? 0.30 : 0.34));
  const flagW = isStory ? 110 : 90;
  const flagH = isStory ? 60 : 48;

  // Type sizing — title goes at the bottom in the dark foreground
  const overlineSize = pick([16, 20, 26] as const, mode);
  const titleSize = pick([90, 130, 170] as const, mode);
  const creditSize = pick([13, 16, 20] as const, mode);

  // Date credit line. Falls back to hardcoded if no eventInfo is bound.
  const dateText =
    eventInfo?.month && eventInfo.day && eventInfo.year
      ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}, ${eventInfo.year}`
      : "JULY 20, 2026";

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      <svg viewBox={vb} style={svgFillStyle} preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Golden-hour sky — pulled WAY warmer than the v1 twilight.
              The user said "mountains at night" — that was the navy at
              the top dominating. Now the gradient is mostly amber/peach
              with just a soft dusty blue cap at the very top, the way
              an Ohio summer dusk actually reads. */}
          <linearGradient id={`alvin-sky-${mode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3E5269" />
            <stop offset="22%"  stopColor="#7A7088" />
            <stop offset="48%"  stopColor="#C28464" />
            <stop offset="72%"  stopColor="#F09455" />
            <stop offset="90%"  stopColor="#FFC07A" />
            <stop offset="100%" stopColor="#FFE0B0" />
          </linearGradient>

          {/* Halo bloom around the pin — softer than v1. */}
          <radialGradient id={`alvin-halo-${mode}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#FFE8B4" stopOpacity="0.45" />
            <stop offset="50%"  stopColor="#FF8030" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FF4000" stopOpacity="0" />
          </radialGradient>

          {/* Far hill — warm haze. Atmospheric perspective via warmer,
              dustier colors instead of the cold-blue version that
              made everything read alpine. */}
          <linearGradient id={`alvin-hill-far-${mode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#8B6450" />
            <stop offset="100%" stopColor="#5C4838" />
          </linearGradient>

          {/* Mid hill — darker green-shadow, hint of fairway color */}
          <linearGradient id={`alvin-hill-mid-${mode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#2A3A2A" />
            <stop offset="100%" stopColor="#152018" />
          </linearGradient>

          {/* Foreground crest — deep emerald shadow with a hint of
              warm rim light along the top edge (sun catching grass) */}
          <linearGradient id={`alvin-fg-${mode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#1A2D1F" />
            <stop offset="20%" stopColor="#0E1A12" />
            <stop offset="100%" stopColor="#06100B" />
          </linearGradient>
        </defs>

        {/* Sky fill — top portion of the frame */}
        <rect x="0" y="0" width={W} height={horizonY + 40} fill={`url(#alvin-sky-${mode})`} />

        {/* Halo bloom behind the pin — drawn before the pin so it
            glows out from behind. */}
        <circle
          cx={poleX}
          cy={poleTopY + flagH * 0.4}
          r={isStory ? 320 : 240}
          fill={`url(#alvin-halo-${mode})`}
        />

        {/* Far hill ridge — VERY gentle Ohio-rolling, not mountain
            peaks. Amplitude reduced to ~15px from horizon line so the
            hills read as fairway, not Rockies. */}
        <path
          d={`M 0 ${horizonY + 28}
              C ${W * 0.3} ${horizonY + 14}, ${W * 0.5} ${horizonY + 32}, ${W * 0.7} ${horizonY + 18}
              C ${W * 0.85} ${horizonY + 12}, ${W} ${horizonY + 24}, ${W} ${horizonY + 30}
              L ${W} ${horizonY + 80}
              L 0 ${horizonY + 80} Z`}
          fill={`url(#alvin-hill-far-${mode})`}
        />

        {/* Mid hill — same lazy roll, slightly more amplitude */}
        <path
          d={`M 0 ${horizonY + 64}
              C ${W * 0.25} ${horizonY + 50}, ${W * 0.5} ${horizonY + 76}, ${W * 0.72} ${horizonY + 56}
              C ${W * 0.88} ${horizonY + 48}, ${W} ${horizonY + 68}, ${W} ${horizonY + 64}
              L ${W} ${H}
              L 0 ${H} Z`}
          fill={`url(#alvin-hill-mid-${mode})`}
        />

        {/* Foreground crest — gentle fairway sweep, no peaks */}
        <path
          d={`M 0 ${H - (isStory ? 240 : isSquare ? 170 : 110)}
              C ${W * 0.35} ${H - (isStory ? 260 : isSquare ? 188 : 122)},
                ${W * 0.7} ${H - (isStory ? 230 : isSquare ? 162 : 102)},
                ${W} ${H - (isStory ? 248 : isSquare ? 178 : 116)}
              L ${W} ${H}
              L 0 ${H} Z`}
          fill={`url(#alvin-fg-${mode})`}
        />

        {/* Flag pole — thin, dark silhouette */}
        <line
          x1={poleX}
          y1={poleTopY}
          x2={poleX}
          y2={poleBottomY}
          stroke="#000"
          strokeWidth={isStory ? 4 : 3}
          strokeLinecap="round"
        />

        {/* Flag — coquelicot, with two-tone fold suggesting wind.
            Lit edge catches the warm sky; trailing edge in shadow. */}
        <path
          d={`M ${poleX} ${poleTopY}
              Q ${poleX + flagW * 0.55} ${poleTopY + flagH * 0.18},
                ${poleX + flagW} ${poleTopY + flagH * 0.45}
              Q ${poleX + flagW * 0.55} ${poleTopY + flagH * 0.65},
                ${poleX} ${poleTopY + flagH * 0.85}
              Z`}
          fill={BRAND.coquelicot}
        />
        {/* Flag fold — shadow side */}
        <path
          d={`M ${poleX} ${poleTopY + flagH * 0.4}
              Q ${poleX + flagW * 0.4} ${poleTopY + flagH * 0.55},
                ${poleX + flagW * 0.7} ${poleTopY + flagH * 0.62}
              Q ${poleX + flagW * 0.4} ${poleTopY + flagH * 0.75},
                ${poleX} ${poleTopY + flagH * 0.85}
              Z`}
          fill="#A52B00"
          opacity="0.75"
        />

        {/* Tiny finial dot at the top of the pole */}
        <circle cx={poleX} cy={poleTopY - 4} r={isStory ? 4 : 3} fill="#000" />
      </svg>

      {/* Type layer */}
      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding: isStory ? "60px 64px 64px" : isSquare ? "44px 56px 48px" : "32px 56px 36px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Top rail — overline only (38th annual). The icon moves to
            the credit row at the bottom, cinema-poster style. */}
        <div>
          <p style={{
            fontSize: overlineSize, fontWeight: 700,
            letterSpacing: "0.24em", color: BRAND.coquelicot,
            textTransform: "uppercase", margin: 0,
          }}>
            38th Annual
          </p>
        </div>

        {/* Title block + credits — anchored bottom in the dark
            foreground area where movie titles live.

            Both lines BN Bergen Bold, uniform weight. The size
            differential carries the hierarchy: "The Chamber" smaller
            (set ~70% of the main title) and "Golf Outing" the hero.
            v1 used Light + Bold contrast which made the Light line
            read as a different typeface entirely. */}
        <div style={{ marginTop: "auto" }}>
          <div style={{
            fontSize: titleSize * 0.7, fontWeight: 700, lineHeight: 0.95,
            letterSpacing: "-0.01em", color: "#fff",
            textTransform: "uppercase",
            opacity: 0.92,
          }}>
            The Chamber
          </div>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.9,
            letterSpacing: "-0.025em", color: "#fff",
            textTransform: "uppercase",
            marginTop: -4,
          }}>
            Golf Outing
          </div>

          {/* Credit line — cinema-poster bottom rail. Date · Venue,
              with the chamber icon sitting on the right as the
              "studio mark". */}
          <div style={{
            marginTop: pick([18, 24, 32] as const, mode),
            paddingTop: pick([14, 18, 22] as const, mode),
            borderTop: `1px solid #ffffff33`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16, flexWrap: "wrap",
          }}>
            <div style={{
              fontSize: creditSize, fontWeight: 700,
              letterSpacing: "0.18em", color: "#fff",
              textTransform: "uppercase",
              opacity: 0.85,
            }}>
              {dateText} · Westfield Country Club
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ASSETS.iconWhite}
              style={{ height: isStory ? 36 : 28, opacity: 0.65 }}
              alt=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   6 — ATHENA AWARDS
   Oxford field, coquelicot radial glow, cambridge laurel wreaths, centered title.
   ============================================================================ */

export function AthenaAwardsGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";
  const titleSize = pick([220, 180, 240] as const, mode);

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const cx = isStory ? 540 : isSquare ? 540 : 600;
  const cy = isStory ? 980 : isSquare ? 540 : 315;
  const rx = isStory ? 420 : isSquare ? 380 : 420;
  const leafR = isStory ? 240 : isSquare ? 220 : 180;
  const leafCount = 14;
  const leafRx = isStory ? 28 : 22;
  const leafRy = isStory ? 11 : 9;

  const renderLeaves = (sideTransform: string) => (
    <g transform={sideTransform}>
      {Array.from({ length: leafCount }, (_, i) => {
        const t = i / (leafCount - 1);
        const a = -Math.PI / 2 + t * Math.PI;
        const cxp = Math.cos(a) * leafR;
        const cyp = Math.sin(a) * leafR;
        const leafA = a + Math.PI / 2 + 0.6;
        return (
          <ellipse
            key={i}
            cx={cxp}
            cy={cyp}
            rx={leafRx}
            ry={leafRy}
            fill={BRAND.cambridge}
            opacity="0.82"
            transform={`rotate(${(leafA * 180) / Math.PI} ${cxp} ${cyp})`}
          />
        );
      })}
    </g>
  );

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          <radialGradient id={`atglow-${mode}`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={BRAND.coquelicot} stopOpacity="0.28" />
            <stop offset="70%" stopColor={BRAND.oxford} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#atglow-${mode})`} />
        {renderLeaves(`translate(${cx - rx / 2}, ${cy})`)}
        {renderLeaves(`translate(${cx + rx / 2}, ${cy}) scale(-1 1)`)}
        <g transform={`translate(${cx}, ${cy + (isStory ? 500 : isSquare ? 380 : 245)})`}>
          <line x1={-140} y1={0} x2={-16} y2={0} stroke={BRAND.cambridge} strokeWidth="1.2" />
          <line x1={16} y1={0} x2={140} y2={0} stroke={BRAND.cambridge} strokeWidth="1.2" />
          <circle cx={0} cy={0} r={3} fill={BRAND.coquelicot} />
        </g>
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "110px 72px 110px" : "56px 64px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44, opacity: 0.95 }} alt="" />
        </div>

        <div>
          <div style={{ fontSize: isStory ? 60 : isSquare ? 44 : 64, fontWeight: 300, fontStyle: "italic", letterSpacing: "0.06em", color: BRAND.coquelicot, lineHeight: 1 }}>The</div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.02em", color: "#fff", marginTop: -6 }}>ATHENA</div>
          <div style={{ fontSize: isStory ? 60 : isSquare ? 40 : 58, fontWeight: 300, letterSpacing: "0.14em", color: BRAND.cambridge, marginTop: 8 }}>A·W·A·R·D·S</div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   7 — SOCIAL CONNECT
   Coquelicot field, confetti circles, "Social Connect." split-color title.
   ============================================================================ */

export function SocialConnectGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([220, 260, 260] as const, mode);
  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;
  const dotCount = isStory ? 70 : isSquare ? 55 : 50;
  const confettiColors = [BRAND.cambridge, BRAND.oxford, "#fff", BRAND.emerald];

  return (
    <div style={containerStyle({ background: BRAND.coquelicot, color: "#fff" })}>
      <svg viewBox={vb} style={svgFillStyle}>
        {Array.from({ length: dotCount }, (_, i) => {
          const seeded = (Math.sin(i * 9999) + 1) / 2;
          const x = ((i * 137) % W) + seeded * 30;
          const y = ((i * 53) % H) + ((Math.cos(i * 7) + 1) / 2) * 40;
          const r = 5 + ((i * 7) % 13);
          return (
            <circle key={i} cx={x} cy={y} r={r} fill={confettiColors[i % 4]} opacity="0.78" />
          );
        })}
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "100px 72px 100px" : isSquare ? "72px 64px" : "56px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44 }} alt="" />
        </div>

        <div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.055em", color: "#fff" }}>
            Social
          </div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.055em", color: BRAND.oxford, marginTop: -10 }}>
            Connect
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   8 — RIBBON CUTTING
   Cream field, coquelicot ribbon arc with cut-guide + scissors, italic title.
   ============================================================================ */

export function RibbonCuttingGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([180, 220, 260] as const, mode);
  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const W = isStory ? 1080 : isSquare ? 1080 : 1200;

  const ribbon = isStory
    ? { y: 1320, cpY: 1260, y2: 1400, cpY2: 1430, scX: 540, scY: 1200 }
    : isSquare
    ? { y: 720,  cpY: 660,  y2: 800,  cpY2: 830,  scX: 540, scY: 600  }
    : { y: 420,  cpY: 360,  y2: 490,  cpY2: 510,  scX: 600, scY: 320  };

  return (
    <div style={containerStyle({ background: BRAND.cream, color: BRAND.oxford })}>
      <svg viewBox={vb} style={svgFillStyle}>
        {/* Ribbon — two stacked wavy paths for depth */}
        <path
          d={`M-40 ${ribbon.y} Q${W * 0.25} ${ribbon.cpY} ${W / 2} ${ribbon.y + 20} T${W + 40} ${ribbon.y} L${W + 40} ${ribbon.y + 70} Q${W * 0.75} ${ribbon.cpY2} ${W / 2} ${ribbon.y2} T-40 ${ribbon.y + 70} Z`}
          fill={BRAND.coquelicot}
        />
        <path
          d={`M-40 ${ribbon.y + 70} Q${W * 0.25} ${ribbon.cpY2} ${W / 2} ${ribbon.y2} T${W + 40} ${ribbon.y + 70} L${W + 40} ${ribbon.y + 90} Q${W * 0.75} ${ribbon.y2 + 15} ${W / 2} ${ribbon.y2 + 5} T-40 ${ribbon.y + 90} Z`}
          fill="#C33500"
        />

        {/* Cut-guide — dashed vertical */}
        <line
          x1={ribbon.scX}
          y1={ribbon.scY - (isStory ? 80 : 50)}
          x2={ribbon.scX}
          y2={ribbon.scY + (isStory ? 240 : 200)}
          stroke={BRAND.oxford}
          strokeWidth="3"
          strokeDasharray="6 6"
          opacity="0.3"
        />

        {/* Scissors — minimal outline icon */}
        <g transform={`translate(${ribbon.scX} ${ribbon.scY}) scale(${isStory ? 1.5 : 1})`}>
          <circle cx="-18" cy="0" r="16" fill="none" stroke={BRAND.oxford} strokeWidth="3" />
          <circle cx="18"  cy="0" r="16" fill="none" stroke={BRAND.oxford} strokeWidth="3" />
          <line x1="-6" y1="8" x2="26"  y2="60" stroke={BRAND.oxford} strokeWidth="3" />
          <line x1="6"  y1="8" x2="-26" y2="60" stroke={BRAND.oxford} strokeWidth="3" />
        </g>
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "120px 72px 110px" : isSquare ? "72px 64px" : "52px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconOrange} style={{ height: isStory ? 56 : 40 }} alt="" />
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.045em", color: BRAND.oxford }}>
            Ribbon
          </div>
          <div style={{ fontSize: titleSize, fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.025em", color: BRAND.oxford, marginTop: -4 }}>
            Cutting
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   9 — BUSINESS BREW  (Philip Castle / Kubrick pass)

   The chamber's friendly happy hour rendered like a Castle film poster.
   Stark cream field. Dead-axial composition. One hyper-stylized
   centerpiece carries the whole frame:

     a coupe glass, airbrushed in radial gradients (light coquelicot
     surface → deep coquelicot bottom, white rim highlight, oxford
     foot shadow), with a single white paper airplane perched on the
     rim like a swizzle stick.

   Type stacks tight beneath — BUSINESS / BREW in oxford BN Bergen,
   classical centered, weight as the design. The slogan slashes
   diagonally across the lower third in coquelicot, the way
   "ULTRAVIOLENCE" slashed Alex's poster. Plinth becomes credits.

   Negative space carries the tension. The orange is the wound.
   ============================================================================ */

export function BusinessBrewGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  // Glass anchor — strict horizontal center. cy chosen per-mode so
  // the bowl + stem + foot sits cleanly above the type block, with
  // a comfortable visual gap. Story has the most vertical room and
  // gets the biggest glass; social is the tightest.
  const glass = isStory
    ? { cx: 540, cy: 620, bowlR: 210, stemH: 120, footR: 85 }
    : isSquare
    ? { cx: 540, cy: 320, bowlR: 150, stemH: 85,  footR: 65 }
    : { cx: 600, cy: 180, bowlR: 80,  stemH: 50,  footR: 38 };

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";

  // Type sizes — landscape (social) is the tightest format and
  // gets the most aggressive size pull-back. Square stays mid.
  // Story keeps the full poster scale.
  const titleSize = pick([90, 150, 220] as const, mode);
  const sloganSize = pick([20, 30, 40] as const, mode);
  const sloganScript = pick([34, 52, 76] as const, mode);

  // Plinth (credits) sizes
  const plinthLabel = pick([13, 18, 24] as const, mode);
  const plinthBig = pick([20, 28, 38] as const, mode);

  // Coupe glass geometry (V-bowl: a triangle with rounded outer edges)
  const bowlTopY = glass.cy - glass.bowlR;
  const bowlPointY = glass.cy + glass.bowlR * 0.05;
  const bowlLeftX = glass.cx - glass.bowlR;
  const bowlRightX = glass.cx + glass.bowlR;
  const stemTopY = bowlPointY + 2;
  const stemBotY = stemTopY + glass.stemH;
  const footY = stemBotY;

  // Liquid surface (an ellipse cut where the V is at that y)
  const liquidLevel = bowlTopY + glass.bowlR * 0.18; // small headroom under rim
  // x-extent of the V at liquidLevel
  const tProgress = (liquidLevel - bowlTopY) / (bowlPointY - bowlTopY);
  const liquidHalfW = glass.bowlR * (1 - tProgress * 1);
  const liquidLeftX = glass.cx - liquidHalfW;
  const liquidRightX = glass.cx + liquidHalfW;

  // Paper airplane on the rim (right side)
  const planeBaseX = glass.cx + glass.bowlR * 0.55;
  const planeBaseY = bowlTopY - 6;
  const planeR = pick([28, 38, 50] as const, mode);

  return (
    <div style={containerStyle({ background: BRAND.cream, color: BRAND.oxford })}>
      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          {/* Airbrushed liquid — bright orange surface fading into
              deep coquelicot at the bowl point. */}
          <radialGradient id={`bbliquid-${mode}`} cx="50%" cy="20%" r="80%">
            <stop offset="0%"  stopColor="#FF6A2E" />
            <stop offset="55%" stopColor={BRAND.coquelicot} />
            <stop offset="100%" stopColor="#9F2400" />
          </radialGradient>
          {/* Glass body shimmer — soft highlight along the inner left
              edge of the bowl. */}
          <linearGradient id={`bbshine-${mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"  stopColor="#fff" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* Rim highlight — narrow white-blue arc */}
          <linearGradient id={`bbrim-${mode}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* Foot shadow — soft cool gradient under the base */}
          <radialGradient id={`bbfootshadow-${mode}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor={BRAND.oxford} stopOpacity="0.3" />
            <stop offset="100%" stopColor={BRAND.oxford} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Foot shadow first (behind everything) */}
        <ellipse
          cx={glass.cx}
          cy={footY + 8}
          rx={glass.footR + 24}
          ry={glass.footR * 0.18}
          fill={`url(#bbfootshadow-${mode})`}
        />

        {/* Glass FOOT (base disc) */}
        <ellipse cx={glass.cx} cy={footY} rx={glass.footR} ry={glass.footR * 0.16} fill={BRAND.oxford} opacity="0.85" />
        <ellipse cx={glass.cx} cy={footY - 2} rx={glass.footR - 6} ry={glass.footR * 0.12} fill={BRAND.cream} opacity="0.6" />

        {/* Glass STEM */}
        <rect
          x={glass.cx - 4}
          y={stemTopY}
          width={8}
          height={glass.stemH}
          fill={BRAND.oxford}
          opacity="0.88"
        />
        <rect
          x={glass.cx - 1.5}
          y={stemTopY}
          width={3}
          height={glass.stemH}
          fill="#fff"
          opacity="0.45"
        />

        {/* Liquid (filled V from rim level down to point) — airbrushed */}
        <path
          d={`M ${liquidLeftX} ${liquidLevel}
              L ${liquidRightX} ${liquidLevel}
              L ${glass.cx} ${bowlPointY}
              Z`}
          fill={`url(#bbliquid-${mode})`}
        />
        {/* Liquid surface highlight — thin ellipse at the rim line */}
        <ellipse
          cx={glass.cx}
          cy={liquidLevel}
          rx={liquidHalfW}
          ry={liquidHalfW * 0.16}
          fill="#FF8C5A"
          opacity="0.85"
        />
        {/* Subtle inner-bowl shadow on the liquid (dark crescent at the
            point, suggests depth) */}
        <ellipse
          cx={glass.cx}
          cy={bowlPointY - liquidHalfW * 0.28}
          rx={liquidHalfW * 0.45}
          ry={liquidHalfW * 0.16}
          fill="#4A0E00"
          opacity="0.35"
        />

        {/* Glass BOWL outline (V) — oxford lines with airbrush shine
            overlay for depth */}
        <path
          d={`M ${bowlLeftX} ${bowlTopY}
              L ${glass.cx} ${bowlPointY}
              L ${bowlRightX} ${bowlTopY}`}
          fill="none"
          stroke={BRAND.oxford}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Inner shine sliver */}
        <path
          d={`M ${bowlLeftX + 8} ${bowlTopY + 6}
              L ${glass.cx - 6} ${bowlPointY - 18}`}
          fill="none"
          stroke={`url(#bbshine-${mode})`}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Rim — single crisp ellipse cap */}
        <ellipse
          cx={glass.cx}
          cy={bowlTopY}
          rx={glass.bowlR}
          ry={glass.bowlR * 0.14}
          fill="none"
          stroke={BRAND.oxford}
          strokeWidth={3}
        />
        {/* Rim highlight — bright crest along top half of the ellipse */}
        <path
          d={`M ${bowlLeftX + glass.bowlR * 0.2} ${bowlTopY - glass.bowlR * 0.04}
              Q ${glass.cx} ${bowlTopY - glass.bowlR * 0.18}
                ${bowlRightX - glass.bowlR * 0.2} ${bowlTopY - glass.bowlR * 0.04}`}
          fill="none"
          stroke={`url(#bbrim-${mode})`}
          strokeWidth={3}
        />

        {/* Paper airplane perched on the right rim */}
        <g transform={`translate(${planeBaseX} ${planeBaseY}) rotate(-18)`}>
          <path
            d={`M ${-planeR} ${planeR * 0.3}
                L ${planeR} ${-planeR * 0.55}
                L ${planeR * 0.08} ${planeR * 0.06}
                Z`}
            fill="#fff"
            stroke={BRAND.oxford}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path
            d={`M ${-planeR} ${planeR * 0.3}
                L ${planeR * 0.08} ${planeR * 0.06}
                L ${planeR * 0.4} ${planeR * 0.5}
                Z`}
            fill="#F0E6D6"
            stroke={BRAND.oxford}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <line
            x1={-planeR}
            y1={planeR * 0.3}
            x2={planeR * 0.08}
            y2={planeR * 0.06}
            stroke={BRAND.oxford}
            strokeWidth={1.5}
          />
        </g>
      </svg>

      {/* Content layer — three flex children pinned by justify-between:
          (1) icon at top, (2) title block anchored above plinth via
          mt:auto, (3) plinth at bottom. The SVG glass renders in the
          empty middle gap. No marginTop kludge. */}
      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding: isStory ? "60px 64px 72px" : isSquare ? "44px 56px 56px" : "28px 48px 36px",
        display: "flex", flexDirection: "column",
        alignItems: "stretch", textAlign: "center",
      }}>
        {/* Top rail — icon only */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconOrange} style={{ height: isStory ? 56 : 36, opacity: 0.95 }} alt="" />
        </div>

        {/* Title + slogan block — mt:auto pushes it to the bottom of
            the available space, just above the plinth. The glass
            occupies the gap between the icon row and this block. */}
        <div style={{ marginTop: "auto" }}>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.86,
            letterSpacing: "-0.045em", color: BRAND.oxford,
          }}>Business</div>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.86,
            letterSpacing: "-0.045em", color: BRAND.coquelicot, marginTop: -6,
          }}>Brew</div>

          {/* Slashed slogan — single line tilted -3°, centered. The
              "ULTRAVIOLENCE" gesture, civilized. Mistrully word in
              oxford for inverted contrast on the cream field. */}
          <div style={{
            marginTop: isStory ? 28 : 14,
            display: "flex", alignItems: "baseline", justifyContent: "center",
            flexWrap: "wrap",
            columnGap: pick([8, 10, 14] as const, mode),
            rowGap: 4,
            transform: "rotate(-3deg)",
            transformOrigin: "center center",
          }}>
            <span style={{
              fontSize: sloganSize, fontWeight: 400,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: BRAND.coquelicot,
            }}>Where</span>
            <span style={{
              fontFamily: SCRIPT_STACK,
              fontSize: sloganScript, lineHeight: 0.9,
              color: BRAND.oxford, fontWeight: 400,
              display: "inline-block",
              transform: "translateY(0.18em)",
            }}>
              Networking
            </span>
            <span style={{
              fontSize: sloganSize, fontWeight: 400,
              letterSpacing: "0.16em", textTransform: "uppercase",
              color: BRAND.coquelicot,
            }}>Takes Flight</span>
          </div>
        </div>

        {/* Plinth as movie credits — pinned to the canvas bottom */}
        {eventInfo && (eventInfo.dayOfWeek || eventInfo.time || eventInfo.note) && (
          <div style={{
            marginTop: pick([14, 20, 26] as const, mode),
            borderTop: `1px solid ${BRAND.oxford}33`,
            paddingTop: pick([10, 16, 22] as const, mode),
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 18, flexWrap: "wrap",
          }}>
            <div style={{ textAlign: "left" }}>
              {(() => {
                const dateLine = [
                  eventInfo.dayOfWeek?.substring(0, 3).toUpperCase(),
                  eventInfo.month && eventInfo.day
                    ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return dateLine ? (
                  <div style={{
                    fontSize: plinthLabel, fontWeight: 700,
                    letterSpacing: "0.18em", color: BRAND.oxford,
                    textTransform: "uppercase", opacity: 0.7,
                  }}>
                    {dateLine}
                  </div>
                ) : null;
              })()}
              {eventInfo.time && (
                <div style={{
                  fontSize: plinthBig, fontWeight: 700,
                  color: BRAND.oxford, letterSpacing: "-0.01em", marginTop: 2,
                }}>
                  {eventInfo.time}
                </div>
              )}
            </div>
            {eventInfo.note && (
              <div style={{
                fontSize: plinthLabel, fontWeight: 700,
                letterSpacing: "0.18em", color: BRAND.coquelicot,
                textTransform: "uppercase", textAlign: "right",
                paddingBottom: 2,
              }}>
                {eventInfo.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   10 — GET TO KNOW THE CHAMBER  (system pass)

   Brought into the design system established by Networking WOW / Safety
   Council / Chamber Chat / Business Brew / Eggs & Expertise:
     • Top rail with chamber wordmark + icon
     • Mistrully-accent tagline ("Start *Here*")
     • Optional event-info plinth (date · time · note)
   Visual identity preserved: cambridge field, dashed map grid, full
   compass SVG. Title kept (3-line stack) since it's the chamber's
   actual mark for this orientation event.
   ============================================================================ */

export function GetToKnowGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([90, 150, 200] as const, mode);
  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;

  // Compass anchored opposite the title in each layout
  const comp = isStory
    ? { cx: 800, cy: 1280, r: 180 }
    : isSquare
    ? { cx: 800, cy: 700,  r: 160 }
    : { cx: 980, cy: 290,  r: 140 };

  // Tagline + plinth sizes — match the system rhythm
  const taglineSize = pick([22, 30, 40] as const, mode);
  const scriptSize = pick([38, 52, 76] as const, mode);
  const plinthLabel = pick([14, 18, 24] as const, mode);
  const plinthBig = pick([22, 28, 38] as const, mode);

  const dateLine = eventInfo
    ? [
        eventInfo.dayOfWeek?.substring(0, 3).toUpperCase(),
        eventInfo.month && eventInfo.day
          ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div style={containerStyle({ background: BRAND.cambridge, color: BRAND.oxford })}>
      <svg viewBox={vb} style={svgFillStyle}>
        {/* Dashed map grid */}
        <g stroke={BRAND.oxford} strokeOpacity="0.12" strokeWidth="1.5" strokeDasharray="4 6" fill="none">
          {Array.from({ length: Math.floor(H / 80) }, (_, i) => (
            <line key={`h${i}`} x1="0"     y1={i * 80 + 40} x2={W}     y2={i * 80 + 40} />
          ))}
          {Array.from({ length: Math.floor(W / 80) }, (_, i) => (
            <line key={`v${i}`} x1={i * 80 + 40} y1="0"     x2={i * 80 + 40} y2={H}     />
          ))}
        </g>

        {/* Compass */}
        <g transform={`translate(${comp.cx} ${comp.cy})`}>
          <circle r={comp.r * 1.8}  fill={BRAND.oxford} opacity="0.05" />
          <circle r={comp.r * 1.4}  fill={BRAND.oxford} opacity="0.06" />
          <circle r={comp.r * 1.05} fill={BRAND.oxford} opacity="0.08" />
          <circle r={comp.r}        fill={BRAND.cream}  stroke={BRAND.oxford} strokeWidth="3" />
          <circle r={comp.r - 12}   fill="none"         stroke={BRAND.oxford} strokeWidth="1" strokeDasharray="2 6" opacity="0.4" />

          {/* Tick marks every 15° */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            const r1 = comp.r - 20;
            const r2 = comp.r - (i % 6 === 0 ? 40 : 30);
            return (
              <line
                key={i}
                x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
                stroke={BRAND.oxford} strokeWidth={i % 6 === 0 ? 3 : 1.5}
              />
            );
          })}

          <text x="0"               y={-comp.r + 62} textAnchor="middle" fill={BRAND.coquelicot}
                fontSize={comp.r * 0.18} fontWeight="700" fontFamily={FONT_STACK}>N</text>
          <text x={comp.r - 36}     y="6"           textAnchor="middle" fill={BRAND.oxford}
                fontSize={comp.r * 0.14} fontWeight="700" fontFamily={FONT_STACK}>E</text>
          <text x="0"               y={comp.r - 48} textAnchor="middle" fill={BRAND.oxford}
                fontSize={comp.r * 0.14} fontWeight="700" fontFamily={FONT_STACK}>S</text>
          <text x={-comp.r + 36}    y="6"           textAnchor="middle" fill={BRAND.oxford}
                fontSize={comp.r * 0.14} fontWeight="700" fontFamily={FONT_STACK}>W</text>

          {/* Needle — points NE */}
          <g transform="rotate(-30)">
            <polygon points={`0,${-comp.r * 0.78} 16,0 0,${comp.r * 0.18} -16,0`}  fill={BRAND.coquelicot} />
            <polygon points={`0,${comp.r * 0.78}  16,0 0,${-comp.r * 0.18} -16,0`} fill={BRAND.oxford} />
            <circle r="10" fill={BRAND.oxford} />
            <circle r="4"  fill={BRAND.cream} />
          </g>
        </g>
      </svg>

      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding: isStory ? "60px 64px 64px" : isSquare ? "44px 56px 56px" : "32px 56px 36px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Top rail — chamber wordmark left, icon right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: pick([14, 16, 20] as const, mode),
            fontWeight: 700, letterSpacing: "0.18em",
            color: BRAND.emerald, textTransform: "uppercase",
          }}>
            Greater Medina Chamber
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconOrange} style={{ height: isStory ? 56 : 36 }} alt="" />
        </div>

        {/* Title + tagline anchored just above the plinth */}
        <div style={{ marginTop: "auto", maxWidth: isStory ? 720 : isSquare ? 620 : 640 }}>
          <div style={{
            fontSize: isStory ? 32 : 22, fontWeight: 400, letterSpacing: "0.02em",
            color: BRAND.emerald, lineHeight: 1,
          }}>Get to know</div>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.88,
            letterSpacing: "-0.045em", color: BRAND.oxford, marginTop: 4,
          }}>the</div>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.88,
            letterSpacing: "-0.045em", color: BRAND.oxford, marginTop: -8,
          }}>Chamber</div>

          {/* Mistrully tagline — "Start *Here*" — single-word script
              accent on "Here" mirrors the system established by the
              other event graphics. Awaiting an official chamber slogan
              for this event; this placeholder fits the orientation
              feel without overcommitting. */}
          <div style={{
            marginTop: isStory ? 28 : 14,
            display: "flex", alignItems: "baseline", flexWrap: "wrap",
            columnGap: pick([10, 12, 16] as const, mode),
            rowGap: 4,
            color: BRAND.oxford,
          }}>
            <span style={{
              fontSize: taglineSize, fontWeight: 400,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Start</span>
            <span style={{
              fontFamily: SCRIPT_STACK,
              fontSize: scriptSize, lineHeight: 0.9,
              color: BRAND.coquelicot, fontWeight: 400,
              display: "inline-block",
              transform: "translateY(0.18em) rotate(-3deg)",
              transformOrigin: "left center",
            }}>
              Here
            </span>
          </div>
        </div>

        {/* Event-info plinth */}
        {eventInfo && (eventInfo.dayOfWeek || eventInfo.time || eventInfo.note) && (
          <div style={{
            marginTop: pick([14, 20, 26] as const, mode),
            borderTop: `1px solid ${BRAND.oxford}33`,
            paddingTop: pick([10, 16, 22] as const, mode),
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 18, flexWrap: "wrap",
          }}>
            <div style={{ textAlign: "left" }}>
              {dateLine && (
                <div style={{
                  fontSize: plinthLabel, fontWeight: 700,
                  letterSpacing: "0.18em", color: BRAND.emerald,
                  textTransform: "uppercase",
                }}>
                  {dateLine}
                </div>
              )}
              {eventInfo.time && (
                <div style={{
                  fontSize: plinthBig, fontWeight: 700,
                  color: BRAND.oxford, letterSpacing: "-0.01em", marginTop: 2,
                }}>
                  {eventInfo.time}
                </div>
              )}
            </div>
            {eventInfo.note && (
              <div style={{
                fontSize: plinthLabel, fontWeight: 700,
                letterSpacing: "0.18em", color: BRAND.coquelicot,
                textTransform: "uppercase", textAlign: "right",
                paddingBottom: 2,
              }}>
                {eventInfo.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   11 — EGGS & EXPERTISE
   Oxford field + cream panel, detailed cracked egg, monthly topic chip.
   Accepts an optional `topic` prop (defaults to "Canva 101").
   ============================================================================ */

export function EggsExpertiseGraphic({
  mode = "social",
  // `topic` is accepted for API compatibility with earlier versions +
  // getEventGraphicRenderer's slug-derived topic forwarding, but the
  // simplified graphic no longer displays it. The card/page below can
  // still show the specific monthly topic.
  topic: _topic = "Canva 101",
  eventInfo,
}: {
  mode?: GraphicMode;
  topic?: string;
  eventInfo?: EventInfo;
}) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([140, 180, 210] as const, mode);
  const ampSize = pick([100, 130, 150] as const, mode);
  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";

  const egg = isStory
    ? { cx: 800, cy: 1420, rx: 190, ry: 240 }
    : isSquare
    ? { cx: 830, cy: 720,  rx: 160, ry: 200 }
    : { cx: 990, cy: 340,  rx: 135, ry: 170 };

  // Build the cracked-zigzag path across the egg's top
  const zW = egg.rx * 1.2;
  const zStartX = egg.cx - zW / 2;
  const zY = egg.cy - egg.ry * 0.35;
  const zSegs = 7;
  let zigzag = `M ${zStartX} ${zY}`;
  for (let i = 1; i <= zSegs; i++) {
    const x = zStartX + (zW * i) / zSegs;
    const yy = zY + (i % 2 === 0 ? -12 : 12);
    zigzag += ` L ${x} ${yy}`;
  }

  const creamPanelStyle: CSSProperties = isStory
    ? { right: 0, top: 0, width: "38%", height: "100%" }
    : { left: 0, bottom: 0, width: "100%", height: isSquare ? "38%" : "35%" };

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      {/* Cream accent panel — bottom (social/square) or right (story) */}
      <div style={{ position: "absolute", background: BRAND.cream, ...creamPanelStyle }} />

      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          <radialGradient id={`eeglow-${mode}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%"   stopColor={BRAND.coquelicot} stopOpacity="0.25" />
            <stop offset="100%" stopColor={BRAND.coquelicot} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={egg.cx} cy={egg.cy} r={Math.max(egg.rx, egg.ry) * 2} fill={`url(#eeglow-${mode})`} />

        {/* Shadow beneath the egg */}
        <ellipse cx={egg.cx} cy={egg.cy + egg.ry + 20} rx={egg.rx * 0.95} ry={egg.ry * 0.1} fill={BRAND.oxford} opacity="0.4" />

        {/* Egg body — classic egg shape with pinched top */}
        <path
          d={`
            M ${egg.cx} ${egg.cy - egg.ry}
            C ${egg.cx + egg.rx * 0.6} ${egg.cy - egg.ry},
              ${egg.cx + egg.rx}       ${egg.cy - egg.ry * 0.3},
              ${egg.cx + egg.rx}       ${egg.cy + egg.ry * 0.1}
            C ${egg.cx + egg.rx}       ${egg.cy + egg.ry * 0.85},
              ${egg.cx + egg.rx * 0.6} ${egg.cy + egg.ry},
              ${egg.cx}                ${egg.cy + egg.ry}
            C ${egg.cx - egg.rx * 0.6} ${egg.cy + egg.ry},
              ${egg.cx - egg.rx}       ${egg.cy + egg.ry * 0.85},
              ${egg.cx - egg.rx}       ${egg.cy + egg.ry * 0.1}
            C ${egg.cx - egg.rx}       ${egg.cy - egg.ry * 0.3},
              ${egg.cx - egg.rx * 0.6} ${egg.cy - egg.ry},
              ${egg.cx}                ${egg.cy - egg.ry}
            Z`}
          fill="#F9F0DC"
        />

        {/* Highlight blob */}
        <ellipse
          cx={egg.cx - egg.rx * 0.35}
          cy={egg.cy - egg.ry * 0.35}
          rx={egg.rx * 0.25}
          ry={egg.ry * 0.2}
          fill="#FFFDF6"
          opacity="0.8"
        />

        {/* Cracked zigzag line */}
        <path d={zigzag} fill="none" stroke={BRAND.oxford} strokeWidth={isStory ? 4 : 3} strokeLinejoin="round" />

        {/* Yolk peek */}
        <circle
          cx={egg.cx + egg.rx * 0.1}
          cy={egg.cy - egg.ry * 0.35}
          r={isStory ? 14 : 10}
          fill={BRAND.coquelicot}
          opacity="0.9"
        />
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "72px 72px 84px" : isSquare ? "56px 64px 64px" : "44px 64px 52px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        {/* Top rail — chamber wordmark left, icon right */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{
            fontSize: pick([14, 16, 20] as const, mode),
            fontWeight: 700, letterSpacing: "0.18em",
            color: BRAND.cambridge, textTransform: "uppercase",
          }}>
            Greater Medina Chamber
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44, opacity: 0.95 }} alt="" />
        </div>

        <div style={{ maxWidth: isStory ? 700 : isSquare ? 600 : 620 }}>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.86, letterSpacing: "-0.045em", color: "#fff" }}>
            Eggs
          </div>
          <div style={{
            fontSize: ampSize, fontWeight: 300, fontStyle: "italic",
            letterSpacing: "-0.015em", color: BRAND.coquelicot, marginTop: -6, lineHeight: 0.9,
          }}>
            &amp;
          </div>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.86,
            letterSpacing: "-0.045em", color: "#fff", marginTop: -6,
          }}>
            Expertise
          </div>

          {/* Chamber's actual slogan: "Serving Up Knowledge" —
              Mistrully on "Knowledge" (the payoff word). */}
          <div style={{
            marginTop: isStory ? 28 : 16,
            display: "flex", alignItems: "baseline", flexWrap: "wrap",
            columnGap: pick([12, 14, 18] as const, mode),
            rowGap: 4,
            color: "#fff",
          }}>
            <span style={{
              fontSize: pick([28, 36, 48] as const, mode), fontWeight: 300,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>Serving Up</span>
            <span style={{
              fontFamily: SCRIPT_STACK,
              fontSize: pick([46, 60, 80] as const, mode), lineHeight: 0.9,
              color: BRAND.cambridge, fontWeight: 400,
              transform: "translateY(0.08em)", display: "inline-block",
            }}>
              Knowledge
            </span>
          </div>
        </div>

        {/* Event-info plinth */}
        {eventInfo && (eventInfo.dayOfWeek || eventInfo.time || eventInfo.note) && (
          <div style={{
            borderTop: `1px solid ${BRAND.cambridge}55`,
            paddingTop: pick([18, 22, 28] as const, mode),
            display: "flex", alignItems: "flex-end", justifyContent: "space-between",
            gap: 24, flexWrap: "wrap",
          }}>
            <div>
              {(() => {
                const dateLine = [
                  eventInfo.dayOfWeek?.substring(0, 3).toUpperCase(),
                  eventInfo.month && eventInfo.day
                    ? `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return dateLine ? (
                  <div style={{
                    fontSize: pick([18, 22, 28] as const, mode), fontWeight: 700,
                    letterSpacing: "0.16em", color: BRAND.cambridge,
                    textTransform: "uppercase",
                  }}>
                    {dateLine}
                  </div>
                ) : null;
              })()}
              {eventInfo.time && (
                <div style={{
                  fontSize: pick([28, 34, 40] as const, mode), fontWeight: 700,
                  color: "#fff", letterSpacing: "-0.01em", marginTop: 4,
                }}>
                  {eventInfo.time}
                </div>
              )}
            </div>
            {eventInfo.note && (
              <div style={{
                fontSize: pick([18, 22, 28] as const, mode), fontWeight: 700,
                letterSpacing: "0.18em", color: BRAND.coquelicot,
                textTransform: "uppercase", textAlign: "right",
                paddingBottom: 4,
              }}>
                {eventInfo.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


/* =============================================================================
   12 — COMING SOON  (placeholder while all graphics are being redesigned)
   ============================================================================ */

export function ComingSoonGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory  = mode === "story";
  const isSquare = mode === "square";

  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;

  const overlineSize = pick([22,  24,  30 ] as const, mode);
  const comingSize   = pick([148, 160, 200] as const, mode);
  const soonSize     = pick([148, 160, 200] as const, mode);
  const subSize      = pick([26,  28,  34 ] as const, mode);
  const iconSize     = pick([54,  60,  72 ] as const, mode);
  const iconY        = pick([52,  58,  72 ] as const, mode);

  const overlineY = isStory ? 680  : isSquare ? 310 : 170;
  const comingY   = isStory ? 820  : isSquare ? 430 : 290;
  const soonY     = isStory ? 980  : isSquare ? 590 : 440;
  const ruleY     = isStory ? 1060 : isSquare ? 660 : 490;
  const subY      = isStory ? 1110 : isSquare ? 710 : 530;

  const dot  = 3;
  const gap  = pick([42, 44, 44] as const, mode);
  const cols = Math.ceil(W / gap) + 1;
  const rows = Math.ceil(H / gap) + 1;

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: BRAND.cream })}>
      <svg style={{ ...svgFillStyle, opacity: 0.09 }} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {Array.from({ length: cols }, (_, c) =>
          Array.from({ length: rows }, (_, r) => (
            <circle key={`${c}-${r}`} cx={c * gap} cy={r * gap} r={dot} fill={BRAND.cambridge} />
          ))
        )}
      </svg>

      <div style={{
        position: "absolute", left: "50%",
        top: isStory ? "47%" : "50%",
        transform: "translate(-50%, -50%)",
        width:  pick([700, 700, 800] as const, mode),
        height: pick([500, 700, 900] as const, mode),
        background: "radial-gradient(ellipse at center, rgba(255,64,0,0.13) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ASSETS.iconWhite} alt="" style={{
        position: "absolute",
        left: pick([48, 52, 52] as const, mode),
        top: iconY, width: iconSize, height: iconSize,
        objectFit: "contain", opacity: 0.9,
      }} />

      <div style={{
        position: "absolute", left: "50%", top: overlineY,
        transform: "translateX(-50%)",
        fontFamily: FONT_STACK, fontSize: overlineSize, fontWeight: 700,
        letterSpacing: "0.22em", textTransform: "uppercase" as const,
        color: BRAND.cambridge, whiteSpace: "nowrap" as const, opacity: 0.85,
      }}>
        Greater Medina Chamber
      </div>

      <div style={{
        position: "absolute", left: "50%", top: comingY,
        transform: "translate(-50%, -50%)",
        fontFamily: FONT_STACK, fontSize: comingSize, fontWeight: 800,
        lineHeight: 1, color: BRAND.cream,
        whiteSpace: "nowrap" as const, letterSpacing: "-0.01em",
      }}>
        Coming
      </div>

      <div style={{
        position: "absolute", left: "50%", top: soonY,
        transform: "translate(-50%, -50%)",
        fontFamily: FONT_STACK, fontSize: soonSize, fontWeight: 800,
        lineHeight: 1, color: BRAND.coquelicot,
        whiteSpace: "nowrap" as const, letterSpacing: "-0.01em",
      }}>
        Soon.
      </div>

      <div style={{
        position: "absolute", left: "50%", top: ruleY,
        transform: "translateX(-50%)",
        width: pick([320, 340, 380] as const, mode), height: 1,
        background: `${BRAND.cambridge}44`,
      }} />

      <div style={{
        position: "absolute", left: "50%", top: subY,
        transform: "translateX(-50%)",
        fontFamily: FONT_STACK, fontSize: subSize, fontWeight: 400,
        color: `${BRAND.cream}99`,
        whiteSpace: "nowrap" as const, letterSpacing: "0.04em",
      }}>
        New event graphics on the way.
      </div>
    </div>
  );
}

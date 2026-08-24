/**
 * Event Graphics — eleven chamber-event social graphics, each renderable
 * at three canvas sizes: social (1200×630), square (1080×1080), story
 * (1080×1920).
 *
 * Shared primitives (types, brand hex, asset URLs, pick helper, container
 * styles, FONT/SCRIPT stacks) live in ./shared. The <FluidGraphicFrame/>
 * scaler is in ./FluidGraphicFrame. Event routing is in ./registry. This
 * file is just the eleven graphic component implementations.
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
   1 — NETWORKING WOW  (v3 — official designed artwork, replaces the
   programmatic K_12 composition)

   The chamber's designed 16:9 artwork replaces the drawn composition, and
   renders CLEAN — no text overlay (owner call 2026-08-24: no plinth on the
   official artwork; date/time already live in the page's event details).
   Square/story modes center-crop the same art via object-fit: cover — both
   designs are center-weighted so the crop holds. Chamber Chat (section 3)
   shares this structure via OfficialArtworkGraphic. The mode/eventInfo props
   stay in the signature so the registry contract is unchanged.
   ============================================================================ */

function OfficialArtworkGraphic({ src }: { src: string }) {
  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

export function NetworkingWowGraphic(_props: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  return <OfficialArtworkGraphic src={ASSETS.networkingWowArt} />;
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
   3 — CHAMBER CHAT  (v3 — official designed artwork, replaces the drawn
   coffee-cup composition)

   Same clean OfficialArtworkGraphic structure as Networking WOW (section 1)
   — artwork only, no text overlay.
   ============================================================================ */

export function ChamberChatGraphic(_props: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  return <OfficialArtworkGraphic src={ASSETS.chamberChatArt} />;
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
        {/* Top rail — overline only (annual). The icon moves to
            the credit row at the bottom, cinema-poster style. */}
        <div>
          <p style={{
            fontSize: overlineSize, fontWeight: 700,
            letterSpacing: "0.24em", color: BRAND.coquelicot,
            textTransform: "uppercase", margin: 0,
          }}>
            Annual
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
  const isStory  = mode === "story";
  const isSquare = mode === "square";

  // Shared event data helpers
  const MONTH_NUM: Record<string, string> = {
    january:"01", february:"02", march:"03",    april:"04",
    may:"05",     june:"06",     july:"07",      august:"08",
    september:"09", october:"10", november:"11", december:"12",
  };
  const issueNo  = eventInfo?.month ? (MONTH_NUM[eventInfo.month.toLowerCase()] ?? "") : "";
  const issueYr  = eventInfo?.year  ? String(eventInfo.year) : "";
  const dayShort = eventInfo?.dayOfWeek?.substring(0, 3).toUpperCase() ?? "";
  const monShort = eventInfo?.month?.substring(0, 3).toUpperCase() ?? "";
  const whenDate = [dayShort, (monShort && eventInfo?.day) ? `${monShort} ${eventInfo.day}` : ""]
    .filter(Boolean).join(" · ");
  const timeLine = eventInfo?.time ?? "";
  const hasVenue = !!eventInfo?.venue;

  // ── SQUARE — port of BrewSquareFlight (1080×1080) ──────────────────────
  if (isSquare) {
    return (
      <div style={containerStyle({ background: BRAND.cream, color: BRAND.oxford })}>
        <svg viewBox="0 0 1080 1080" style={svgFillStyle} xmlns="http://www.w3.org/2000/svg">
          <path d="M -80 780 C 240 420, 620 220, 1180 120"
            fill="none" stroke={BRAND.coquelicot} strokeWidth="5"
            strokeLinecap="round" strokeDasharray="2 18" />
        </svg>
        <div style={{ position: "absolute", inset: 0, zIndex: 2, fontFamily: FONT_STACK }}>
          <div style={{ position: "absolute", top: 70, left: 70, fontSize: 22, letterSpacing: 8, fontWeight: 700 }}>
            MEDINA CHAMBER · MONTHLY NETWORKING
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/events/business-brew/business-brew-networking-medina-chamber-009.webp" alt="" width={320}
            style={{ position: "absolute", top: 140, right: 90, height: "auto", display: "block" }} />
          <div style={{ position: "absolute", top: 320, left: 70, right: 450 }}>
            <div style={{ fontFamily: SCRIPT_STACK, color: BRAND.coquelicot, fontSize: 76, lineHeight: 0.9, marginBottom: 4 }}>
              Business
            </div>
            <div style={{ fontSize: 200, fontWeight: 700, letterSpacing: -2, lineHeight: 0.88 }}>BREW</div>
            <div style={{ marginTop: 20, width: 120, height: 4, background: BRAND.cambridge }} />
            <div style={{ marginTop: 22, fontSize: 26, letterSpacing: 3, opacity: 0.8, fontWeight: 700, lineHeight: 1.25, maxWidth: 480 }}>
              Where networking<br />takes flight.
            </div>
          </div>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 260,
            background: BRAND.oxford, color: BRAND.cream, padding: "44px 70px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, letterSpacing: 5, color: BRAND.cambridge, fontWeight: 700, marginBottom: 8 }}>WHEN</div>
                <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 0.95, letterSpacing: 1 }}>{whenDate || "—"}</div>
                {timeLine && <div style={{ fontSize: 26, marginTop: 6, opacity: 0.9 }}>{timeLine}</div>}
              </div>
              {hasVenue && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, letterSpacing: 5, color: BRAND.cambridge, fontWeight: 700, marginBottom: 8 }}>WHERE</div>
                  <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{eventInfo!.venue}</div>
                  {eventInfo?.address && <div style={{ fontSize: 22, marginTop: 6, opacity: 0.85, lineHeight: 1.25 }}>{eventInfo.address}</div>}
                </div>
              )}
            </div>
            <div style={{
              marginTop: 28, paddingTop: 18,
              borderTop: `1px solid ${BRAND.cambridge}44`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: 18, letterSpacing: 3, opacity: 0.85 }}>Free to attend · RSVP preferred</div>
              <div style={{ fontSize: 18, letterSpacing: 4, color: BRAND.cambridge, fontWeight: 700 }}>MEDINACHAMBER.COM</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── STORY — port of BrewStory (1080×1920) ──────────────────────────────
  if (isStory) {
    return (
      <div style={containerStyle({ background: BRAND.cream, color: BRAND.oxford })}>
        <svg viewBox="0 0 1080 1920" style={svgFillStyle} xmlns="http://www.w3.org/2000/svg">
          <path d="M -60 1500 C 260 1100, 700 900, 1160 500"
            fill="none" stroke={BRAND.coquelicot} strokeWidth="5"
            strokeLinecap="round" strokeDasharray="2 18" />
          <path d="M -60 1620 C 260 1260, 700 1080, 1160 700"
            fill="none" stroke={BRAND.cambridge} strokeWidth="4" opacity="0.7"
            strokeLinecap="round" strokeDasharray="2 18" />
        </svg>
        <div style={{ position: "absolute", inset: 0, zIndex: 2, fontFamily: FONT_STACK }}>
          <div style={{
            position: "absolute", top: 140, left: 0, right: 0, textAlign: "center",
            fontSize: 26, letterSpacing: 10, fontWeight: 700, color: BRAND.coquelicot,
          }}>
            · MONTHLY NETWORKING ·
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/events/business-brew/business-brew-networking-medina-chamber-009.webp" alt="" width={440}
            style={{ position: "absolute", top: 230, left: "50%", transform: "translateX(-50%)", height: "auto", display: "block" }} />
          <div style={{ position: "absolute", top: 1080, left: 0, right: 0, textAlign: "center" }}>
            <div style={{ fontFamily: SCRIPT_STACK, color: BRAND.cambridge, fontSize: 104, lineHeight: 0.9, marginBottom: -10 }}>
              Business
            </div>
            <div style={{ fontSize: 240, fontWeight: 700, letterSpacing: -4, lineHeight: 0.88 }}>BREW</div>
          </div>
          <div style={{
            position: "absolute", top: 1430, left: 0, right: 0, textAlign: "center",
            fontSize: 30, letterSpacing: 6, fontWeight: 700, opacity: 0.85,
          }}>
            WHERE NETWORKING TAKES FLIGHT
          </div>
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 380,
            background: BRAND.oxford, color: BRAND.cream, padding: "50px 80px",
          }}>
            <div style={{ fontSize: 74, fontWeight: 700, letterSpacing: 1, lineHeight: 1 }}>{whenDate || "—"}</div>
            {timeLine && <div style={{ fontSize: 40, marginTop: 10, color: BRAND.cambridge, letterSpacing: 3, fontWeight: 700 }}>{timeLine}</div>}
            {hasVenue && (
              <div style={{ fontSize: 28, marginTop: 20, opacity: 0.9, lineHeight: 1.3 }}>
                {eventInfo!.venue}{eventInfo?.address ? ` · ${eventInfo.address}` : ""}
              </div>
            )}
            <div style={{
              marginTop: 28, paddingTop: 20,
              borderTop: `1px solid ${BRAND.cambridge}55`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: 20, letterSpacing: 3, opacity: 0.85 }}>Free · RSVP preferred</div>
              <div style={{ fontSize: 20, letterSpacing: 4, color: BRAND.cambridge, fontWeight: 700 }}>MEDINACHAMBER.COM</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SOCIAL — Brew4KLandscape proportionally scaled to 1200×630 ─────────
  // Source: 3840×2160. scX = 1200/3840 ≈ 0.3125, scY = 630/2160 ≈ 0.2917.
  const W  = 1200;
  const H  = 630;
  const scX = W / 3840;
  const scY = H / 2160;
  const S = (x: number) => x * scX;   // horizontal
  const Y = (y: number) => y * scY;   // vertical

  return (
    <div style={containerStyle({ background: BRAND.cream, color: BRAND.oxford })}>
      <svg viewBox={`0 0 ${W} ${H}`} style={svgFillStyle} xmlns="http://www.w3.org/2000/svg">
        <path
          d={`M ${S(-200)} ${Y(1600)} C ${S(800)} ${Y(900)}, ${S(2100)} ${Y(600)}, ${S(4000)} ${Y(280)}`}
          fill="none" stroke={BRAND.coquelicot} strokeWidth={S(10)}
          strokeLinecap="round" strokeDasharray={`${S(4)} ${S(36)}`} />
        <path
          d={`M ${S(-200)} ${Y(1780)} C ${S(800)} ${Y(1180)}, ${S(2100)} ${Y(900)}, ${S(4000)} ${Y(620)}`}
          fill="none" stroke={BRAND.cambridge} strokeWidth={S(8)} opacity="0.6"
          strokeLinecap="round" strokeDasharray={`${S(4)} ${S(36)}`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, zIndex: 2, fontFamily: FONT_STACK }}>
        {/* Eyebrow */}
        <div style={{
          position: "absolute", top: Y(140), left: S(200), right: S(200),
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: S(40), letterSpacing: S(14), fontWeight: 700,
          paddingBottom: Y(40), borderBottom: `${S(3)}px solid ${BRAND.oxford}`,
        }}>
          <span>GREATER MEDINA CHAMBER · MONTHLY NETWORKING</span>
          {issueNo && issueYr && (
            <span style={{ color: BRAND.coquelicot }}>NO. {issueNo}, {issueYr}</span>
          )}
        </div>
        {/* Bee-mug */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/events/business-brew/business-brew-networking-medina-chamber-009.webp" alt=""
          width={S(640)}
          style={{ position: "absolute", top: Y(380), right: S(320), height: "auto", display: "block" }} />
        {/* Headline stack */}
        <div style={{ position: "absolute", top: Y(532), left: S(200), width: S(2400), zIndex: 2 }}>
          <div style={{
            fontFamily: SCRIPT_STACK, color: BRAND.coquelicot,
            fontSize: S(340), lineHeight: 0.85, marginBottom: Y(-30),
          }}>
            Business
          </div>
          <div style={{ fontSize: S(620), fontWeight: 700, letterSpacing: S(-10), lineHeight: 0.86 }}>
            BREW
          </div>
          <div style={{ marginTop: Y(50), width: S(220), height: Y(8), background: BRAND.cambridge }} />
          <div style={{
            marginTop: Y(60), fontSize: S(170), letterSpacing: S(4),
            fontWeight: 700, opacity: 0.85, lineHeight: 1.0,
          }}>
            WHERE NETWORKING<br />TAKES{" "}
            <span style={{
              color: BRAND.coquelicot,
              fontStyle: "italic",
              display: "inline-block",
              transform: "skewX(-4deg) translateY(-0.06em)",
              letterSpacing: S(6),
            }}>FLIGHT!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   10 — GET TO KNOW THE CHAMBER

   Teal foundation. One dominant image: a circular photo portal positioned
   right-of-center, bleeding off-frame (Saul Bass kinetic tension). Massive
   Mistrully "get to know" IS the composition — it sweeps left-to-right,
   crossing through the circle so type and image are one unified mark (Paul
   Rand). Coquelicot focal dot marks the exact threshold where the type
   enters the circle (John Alvin single light source). φ scaffolding holds
   the invisible geometry (Esoteric). Logo is a small bottom stamp, not a
   decoration — the type does the talking.
   ============================================================================ */

export function GetToKnowGraphic({
  mode = "social",
  eventInfo,
}: {
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const isStory  = mode === "story";
  const isSquare = mode === "square";

  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;

  // ── Central medallion ─────────────────────────────────────────────────────
  // Social: circle sits right-of-center; square + story: centered on canvas.
  const cR  = pick([245, 295, 385] as const, mode); // radius
  const cCx = pick([862, 540, 540] as const, mode); // center X
  const cCy = pick([315, 390, 820] as const, mode); // center Y

  // ── Typography scale ──────────────────────────────────────────────────────
  const knowSize    = pick([238, 232, 308] as const, mode);
  const getToSize   = pick([46,  50,  68]  as const, mode);
  const chamberSize = pick([27,  31,  43]  as const, mode);
  const infoSize    = pick([14,  16,  22]  as const, mode);
  const pad         = pick([60,  72,  96]  as const, mode);

  // ── Text layout ───────────────────────────────────────────────────────────
  // Social: left-aligned type on left side; square + story: centered.
  const isCentered = isSquare || isStory;
  const textX      = isCentered ? W / 2 : pad;
  const tAnchor    = isCentered ? "middle" : "start";

  // Y baselines
  const getToY   = pick([86,  88,  272] as const, mode);
  const knowY    = pick([356, 530, 592] as const, mode);
  const ruleY    = pick([390, 574, 644] as const, mode);
  const chamberY = pick([432, 628, 710] as const, mode);

  // Rule width: centered modes use proportional inset; social follows text width
  const ruleX1 = isCentered ? W * 0.18 : pad;
  const ruleX2 = isCentered ? W * 0.82 : pad + knowSize * 2.2;

  const dateLine = eventInfo
    ? [eventInfo.dayOfWeek, eventInfo.month,
       eventInfo.day ? `${eventInfo.day},` : "", eventInfo.year ?? ""]
       .filter(Boolean).join(" · ").replace(/\s{2,}/g, " ").trim()
    : "";

  // Unique gradient/filter IDs scoped per mode (component can appear multiple times)
  const uid = `gtk2-${mode}`;

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: BRAND.cream })}>
      <svg viewBox={`0 0 ${W} ${H}`} style={svgFillStyle}>
        <defs>
          {/* Background: Castle airbrush warm glow */}
          {/* A soft cream halo centred on the medallion bleeds across the canvas
              like the signature Castle spotlight — warmth emanating from a single
              source, the dark field pressing in from the edges. */}
          <radialGradient
            id={`${uid}-bg`}
            cx={cCx} cy={cCy} r={cR * 2.4}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor={BRAND.cream}    stopOpacity="0.20" />
            <stop offset="38%"  stopColor={BRAND.cambridge} stopOpacity="0.07" />
            <stop offset="100%" stopColor={BRAND.oxford}    stopOpacity="0"    />
          </radialGradient>

          {/* "KNOW" text gradient */}
          {/* Cream at cap-height → cambridge at baseline: simulates a top-lit
              airbrush pass, as if the word has weight and is lit from above. */}
          <linearGradient
            id={`${uid}-know`}
            x1={textX} y1={knowY - knowSize}
            x2={textX} y2={knowY}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor={BRAND.cream}                     />
            <stop offset="65%"  stopColor={BRAND.cambridge}                  />
            <stop offset="100%" stopColor={BRAND.cambridge} stopOpacity="0.72" />
          </linearGradient>

          {/* Circle clip path for photo */}
          <clipPath id={`${uid}-clip`}>
            <circle cx={cCx} cy={cCy} r={cR} />
          </clipPath>

          {/* Circle edge vignette */}
          {/* Darkens the perimeter of the photo, keeping the painted look
              — Castle always lost the photo into the dark at the edges. */}
          <radialGradient
            id={`${uid}-vig`}
            cx={cCx} cy={cCy} r={cR}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="30%"  stopColor={BRAND.oxford} stopOpacity="0"    />
            <stop offset="78%"  stopColor={BRAND.oxford} stopOpacity="0.28" />
            <stop offset="100%" stopColor={BRAND.oxford} stopOpacity="0.60" />
          </radialGradient>

          {/* Outer bloom filter */}
          {/* Low-pass blur applied to the coquelicot outer ring to create
              the halation effect Castle got with real airbrush overspray. */}
          <filter id={`${uid}-bloom`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          </filter>

          {/* "KNOW" text shadow */}
          {/* Ensures contrast when the text overlaps the photo substrate. */}
          <filter id={`${uid}-tshadow`} x="-4%" y="-15%" width="108%" height="130%">
            <feDropShadow
              dx="0" dy="3" stdDeviation="10"
              floodColor={BRAND.oxford} floodOpacity="0.50"
            />
          </filter>
        </defs>

        {/* Layer 1: Base field */}
        <rect x={0} y={0} width={W} height={H} fill={BRAND.oxford} />

        {/* Layer 2: Airbrush warm spotlight */}
        <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-bg)`} />

        {/* Layer 3: Outer coquelicot bloom halo */}
        {/* The blurred ring at full opacity 0.09 reads as a soft chromatic
            aura — Castle's coquelicot was never flat, always luminous. */}
        <circle
          cx={cCx} cy={cCy} r={cR + 24}
          fill="none" stroke={BRAND.coquelicot}
          strokeWidth={50} opacity={0.09}
          filter={`url(#${uid}-bloom)`}
        />

        {/* Layer 4: Precision structural rings */}
        {/* Two clean concentric rings — the retrofuturist precision that
            anchors the softness of the airbrush work. */}
        <circle
          cx={cCx} cy={cCy} r={cR + 18}
          fill="none" stroke={BRAND.coquelicot}
          strokeWidth={isStory ? 2.5 : 1.6}
          opacity={0.70}
        />
        <circle
          cx={cCx} cy={cCy} r={cR + 9}
          fill="none" stroke={BRAND.cambridge}
          strokeWidth={isStory ? 2 : 1.2}
          opacity={0.38}
        />

        {/* Layer 5: Photo substrate */}
        {/* The photographic base Castle would paint over — real people,
            real warmth, real event — barely glimpsed beneath the wash. */}
        <image
          href={ASSETS.getToKnow}
          x={cCx - cR} y={cCy - cR}
          width={cR * 2} height={cR * 2}
          clipPath={`url(#${uid}-clip)`}
          preserveAspectRatio="xMidYMid slice"
        />

        {/* Layer 6: Cambridge airbrush color wash */}
        {/* Castle's signature move: lay a flat chromatic wash over the photo
            to unify it with the surrounding palette. The photo still breathes
            through — warm faces under cool teal light. */}
        <circle
          cx={cCx} cy={cCy} r={cR}
          fill={BRAND.cambridge} opacity={0.50}
          clipPath={`url(#${uid}-clip)`}
        />

        {/* Layer 7: Edge vignette */}
        <circle cx={cCx} cy={cCy} r={cR} fill={`url(#${uid}-vig)`} />

        {/* Layer 8: Centre reticle — retrofuturist precision mark */}
        {/* A sighting-ring + 8-ray starburst at the medallion's heart.
            Lifts the whole piece into the graphic-design-as-architecture space
            Castle inhabited. Coquelicot at partial opacity — noticed, not forced. */}
        <circle
          cx={cCx} cy={cCy} r={cR * 0.065}
          fill="none" stroke={BRAND.coquelicot}
          strokeWidth={isStory ? 2 : 1.4}
          opacity={0.85}
        />
        <circle
          cx={cCx} cy={cCy} r={cR * 0.020}
          fill={BRAND.coquelicot} opacity={0.80}
        />
        {Array.from({ length: 8 }).map((_, i) => {
          const a  = (i * Math.PI * 2) / 8;
          const r0 = cR * 0.090;
          const r1 = cR * 0.195;
          return (
            <line
              key={i}
              x1={cCx + Math.cos(a) * r0} y1={cCy + Math.sin(a) * r0}
              x2={cCx + Math.cos(a) * r1} y2={cCy + Math.sin(a) * r1}
              stroke={BRAND.coquelicot}
              strokeWidth={isStory ? 1.8 : 1.2}
              opacity={0.72}
            />
          );
        })}

        {/* Layer 9: Typography */}

        {/* "GET TO" — small, tracked, warm cream. The setup before the reveal. */}
        <text
          x={textX} y={getToY}
          fontFamily={FONT_STACK} fontWeight={700} fontSize={getToSize}
          fill={BRAND.cream} letterSpacing="0.22em"
          textAnchor={tAnchor} opacity={0.82}
        >
          GET TO
        </text>

        {/* "KNOW" — the Castle word. Gradient-painted, airbrushed from cream
            at the cap-height to cambridge at the baseline. Drop shadow ensures
            it reads whether it falls over the photo or the dark field. */}
        <text
          x={textX} y={knowY}
          fontFamily={FONT_STACK} fontWeight={700} fontSize={knowSize}
          fill={`url(#${uid}-know)`}
          letterSpacing="-0.04em"
          textAnchor={tAnchor}
          filter={`url(#${uid}-tshadow)`}
        >
          KNOW
        </text>

        {/* Coquelicot rule — the Castle signature divider */}
        <line
          x1={ruleX1} y1={ruleY}
          x2={ruleX2} y2={ruleY}
          stroke={BRAND.coquelicot}
          strokeWidth={isStory ? 3 : 2}
        />

        {/* "THE CHAMBER" — cambridge teal, wide tracking, calm authority */}
        <text
          x={textX} y={chamberY}
          fontFamily={FONT_STACK} fontWeight={700} fontSize={chamberSize}
          fill={BRAND.cambridge} letterSpacing="0.26em"
          textAnchor={tAnchor}
        >
          THE CHAMBER
        </text>

        {/* Layer 10: Event info */}
        {eventInfo && (
          <>
            <text
              x={textX} y={H - pad - infoSize * 1.9}
              fontFamily={FONT_STACK} fontWeight={700}
              fontSize={infoSize * 0.80}
              fill={BRAND.cream} letterSpacing="0.12em" opacity={0.50}
              textAnchor={tAnchor}
            >
              {dateLine.toUpperCase()}
            </text>
            <text
              x={textX} y={H - pad}
              fontFamily={FONT_STACK} fontWeight={700} fontSize={infoSize}
              fill={BRAND.cream} letterSpacing="-0.01em"
              textAnchor={tAnchor}
            >
              {(eventInfo.time ?? "") + (eventInfo.venue ? `  ·  ${eventInfo.venue}` : "")}
            </text>
          </>
        )}

        {/* Story-only: Mistrully ghost in the lower void */}
        {/* Story format is tall — a whispered script "know" at the bottom
            fills the negative space without competing with the medallion. */}
        {isStory && (
          <text
            x={W / 2} y={H * 0.88}
            fontFamily={SCRIPT_STACK} fontSize={340} fontWeight={400}
            fill={BRAND.cambridge} opacity={0.055}
            textAnchor="middle"
          >
            know
          </text>
        )}
      </svg>
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


/* ComingSoonGraphic removed pre-launch — was a placeholder for an in-progress
   graphics redesign that never finished. No event slug routed to it via
   getEventGraphicRenderer, and the EVENT_GRAPHICS showcase array did not list
   it. Pure dead code at removal time. */

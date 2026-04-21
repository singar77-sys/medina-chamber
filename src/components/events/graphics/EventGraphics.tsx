/**
 * Event Graphics — six chamber-event social graphics, each renderable at
 * three canvas sizes: social (1200×630), square (1080×1080), story (1080×1920).
 *
 * Ported from the AIDesigner "finals.jsx" adoption bundle. The components are
 * pure render — no state, no hooks — so they work as server components. Brand
 * colors are intentionally kept local (not tied to globals.css tokens) so the
 * graphics render identically regardless of theme or future token drift.
 */

import type { CSSProperties, ReactNode } from "react";

export type GraphicMode = "social" | "square" | "story";

export const GRAPHIC_MODES = ["social", "square", "story"] as const;

/** Canvas dimensions per mode — these are the "design-intent" pixels. */
export const GRAPHIC_DIMS: Record<GraphicMode, { w: number; h: number }> = {
  social: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
  story:  { w: 1080, h: 1920 },
};

const BRAND = {
  oxford:     "#0C1B33",
  cambridge:  "#83BCA9",
  coquelicot: "#FF4000",
  emerald:    "#005450",
  cream:      "#F4EFE6",
  paper:      "#F7F5EF",
};

/** Asset URLs — live under public/ */
const ASSETS = {
  iconWhite:  "/images/chamber-logos/icon-white.png",
  iconOrange: "/images/chamber-logos/icon-orange.png",
  iconGreen:  "/images/chamber-logos/icon-green.png",
  networking: "/images/events/networking.webp",
};

/** Pick the right value for the current mode from a 3-tuple [social, square, story]. */
function pick<T>(values: readonly [T, T, T], mode: GraphicMode): T {
  return mode === "social" ? values[0] : mode === "square" ? values[1] : values[2];
}

const FONT_STACK = '"BN Bergen", system-ui, -apple-system, sans-serif';

/* =============================================================================
   GRAPHIC FRAME — scales a graphic to a target display width while preserving
   the design-intent pixel dimensions inside. Uses CSS transform scale so all
   inner px values stay faithful to the design.
   ============================================================================ */

export function GraphicFrame({
  mode,
  displayWidth,
  className,
  children,
}: {
  mode: GraphicMode;
  displayWidth: number;
  className?: string;
  children: ReactNode;
}) {
  const { w, h } = GRAPHIC_DIMS[mode];
  const scale = displayWidth / w;
  const displayHeight = h * scale;

  return (
    <div
      className={className}
      style={{
        width: displayWidth,
        height: displayHeight,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: w,
          height: h,
          position: "absolute",
          top: 0,
          left: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* =============================================================================
   1 — NETWORKING WOW
   Oxford blue field, coquelicot "WOW!" wordmark, cambridge radial burst.
   ============================================================================ */

export function NetworkingWowGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleTop = pick([180, 132, 170] as const, mode);
  const titleBig = pick([260, 220, 300] as const, mode);

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const gradCx = isStory ? "50%" : isSquare ? "82%" : "78%";
  const gradCy = isStory ? "28%" : "50%";

  const cx = isStory ? 540 : isSquare ? 900 : 940;
  const cy = isStory ? 550 : isSquare ? 540 : 315;
  const scale = isStory ? 1.4 : 1;
  const r1 = 200 * scale;
  const r2 = 250 * scale;

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          <radialGradient id={`nwglow-${mode}`} cx={gradCx} cy={gradCy} r="55%">
            <stop offset="0%" stopColor={BRAND.coquelicot} stopOpacity="0.45" />
            <stop offset="70%" stopColor={BRAND.coquelicot} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill={`url(#nwglow-${mode})`} />

        <g>
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const r2i = r2 + (i % 3) * 12;
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cy + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2i}
                y2={cy + Math.sin(a) * r2i}
                stroke={BRAND.cambridge}
                strokeOpacity={0.5}
                strokeWidth={2 * scale}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={150 * scale} fill="none" stroke={BRAND.cambridge} strokeWidth={1.5 * scale} strokeDasharray="2 6" opacity={0.55} />
          <circle cx={cx} cy={cy} r={110 * scale} fill="none" stroke={BRAND.cambridge} strokeWidth={1.2 * scale} opacity={0.35} />
        </g>
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "80px 72px 90px" : isSquare ? "64px 64px" : "56px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44, opacity: 0.95 }} alt="" />
        </div>

        <div>
          <div style={{ fontSize: titleTop, fontWeight: 700, lineHeight: 0.82, letterSpacing: "-0.05em", color: "#fff" }}>
            Networking
          </div>
          <div style={{ fontSize: titleBig, fontWeight: 700, lineHeight: 0.82, letterSpacing: "-0.06em", color: BRAND.coquelicot, marginTop: -20, marginLeft: -8 }}>
            WOW!
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   2 — SAFETY COUNCIL
   Emerald field, coquelicot/oxford hazard stripe, ring monogram.
   ============================================================================ */

export function SafetyCouncilGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([180, 220, 260] as const, mode);

  const hazardStyle: CSSProperties = isStory
    ? {
        top: 0, left: 0, right: 0, height: 50,
        background: `repeating-linear-gradient(45deg, ${BRAND.coquelicot} 0 28px, ${BRAND.oxford} 28px 56px)`,
      }
    : {
        top: 0, right: 0, bottom: 0, width: isSquare ? 50 : 60,
        background: `repeating-linear-gradient(-45deg, ${BRAND.coquelicot} 0 24px, ${BRAND.oxford} 24px 48px)`,
      };

  const monogramStyle: CSSProperties = isStory
    ? { right: -100, bottom: 140, width: 600, height: 600 }
    : isSquare
    ? { left: -60, bottom: -60, width: 520, height: 520 }
    : { left: -80, bottom: -80, width: 520, height: 520 };

  return (
    <div style={containerStyle({ background: BRAND.emerald, color: "#fff" })}>
      <div style={{ position: "absolute", ...hazardStyle }} />

      <svg viewBox="0 0 400 400" style={{ position: "absolute", opacity: 0.12, ...monogramStyle }}>
        <g fill="none" stroke="#fff" strokeWidth="2">
          <circle cx="200" cy="200" r="60" />
          <circle cx="200" cy="200" r="110" />
          <circle cx="200" cy="200" r="160" strokeDasharray="3 6" />
          <line x1="30" y1="200" x2="370" y2="200" />
          <line x1="200" y1="30" x2="200" y2="370" />
        </g>
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "110px 72px 80px" : isSquare ? "72px 100px 72px 64px" : "56px 100px 56px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44, opacity: 0.9 }} alt="" />
        </div>

        <div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.82, letterSpacing: "-0.045em", color: "#fff" }}>Safety</div>
          <div style={{ fontSize: titleSize, fontWeight: 300, lineHeight: 0.82, letterSpacing: "-0.04em", color: BRAND.cambridge, fontStyle: "italic" }}>Council</div>
        </div>
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

export function ChamberChatGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";

  // Cup position is aspect-specific: wide layouts (social, square) put
  // the cup on the right and the title on the left. Story is portrait —
  // the title sits at the bottom, so the cup goes up top so they don't
  // collide. Centered horizontally for a symmetric vertical composition.
  const cup = isStory
    ? { cx: 540, cy: 820,  rx: 260, ry: 65, h: 290 }
    : isSquare
    ? { cx: 820, cy: 720,  rx: 200, ry: 50, h: 220 }
    : { cx: 980, cy: 400,  rx: 170, ry: 42, h: 200 };

  const titleSize = pick([140, 200, 260] as const, mode);
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
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
        </div>
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
   5 — GOLF OUTING
   Paper field, giant "38" watermark, green + flag SVG, emerald accent title.
   ============================================================================ */

export function GolfOutingGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([180, 210, 240] as const, mode);
  const bigNum = pick([680, 820, 1000] as const, mode);

  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const cx = isStory ? 540 : isSquare ? 820 : 1000;
  const cy = isStory ? 1640 : isSquare ? 920 : 540;
  const rx = isStory ? 340 : 280;
  const ry = isStory ? 32 : 26;
  const flagTop = isStory ? 1180 : isSquare ? 620 : 250;
  const flagW = isStory ? 160 : 120;
  const flagH = isStory ? 70 : 50;
  const flagMid = isStory ? 26 : 20;
  const flagBottom = isStory ? 44 : 30;

  return (
    <div style={containerStyle({ background: BRAND.paper, color: BRAND.oxford })}>
      <div style={{
        position: "absolute",
        right: isStory ? -60 : -40, top: isStory ? -140 : -80,
        fontSize: bigNum, fontWeight: 700, lineHeight: 1,
        color: BRAND.coquelicot, opacity: 0.12, letterSpacing: "-0.08em",
      }}>
        38
      </div>

      <svg viewBox={vb} style={svgFillStyle}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={BRAND.emerald} opacity="0.9" />
        <ellipse cx={cx} cy={cy} rx={rx * 0.72} ry={ry * 0.7} fill={BRAND.cambridge} opacity="0.8" />
        <circle cx={cx} cy={cy} r={isStory ? 14 : 10} fill={BRAND.oxford} />
        <line x1={cx} y1={cy} x2={cx} y2={flagTop} stroke={BRAND.oxford} strokeWidth={isStory ? 6 : 4} />
        <path d={`M${cx} ${flagTop} L${cx + flagW} ${flagTop + flagMid} L${cx + flagW} ${flagTop + flagH} L${cx} ${flagTop + flagBottom} Z`} fill={BRAND.coquelicot} />
        <text x={cx + flagW / 2} y={flagTop + (isStory ? 34 : 25)} fill="#fff" fontFamily={FONT_STACK} fontSize={isStory ? 34 : 24} fontWeight="700" textAnchor="middle" dominantBaseline="central">
          18
        </text>
      </svg>

      <div style={{
        position: "relative", height: "100%",
        padding: isStory ? "110px 72px 80px" : "64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconGreen} style={{ height: isStory ? 60 : 44 }} alt="" />
        </div>

        <div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.045em", color: BRAND.oxford }}>
            The Chamber
          </div>
          <div style={{ fontSize: titleSize, fontWeight: 700, lineHeight: 0.85, letterSpacing: "-0.045em", color: BRAND.emerald, marginTop: -4 }}>
            Golf Outing
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
   9 — BUSINESS BREW  (redesign v2)
   Oxford field, warm coquelicot radial glow, cambridge dot texture, a pint
   of beer clinking a highball cocktail (with ice + citrus wedge), and the
   event repositioned from morning coffee → after-5 drinks.
   ============================================================================ */

export function BusinessBrewGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([180, 220, 260] as const, mode);
  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;

  // Center point for the pair of glasses + the uniform scale factor
  const center = isStory
    ? { cx: 540, cy: 1420, scale: 1.4 }
    : isSquare
    ? { cx: 820, cy: 760,  scale: 1.0 }
    : { cx: 970, cy: 370,  scale: 0.92 };
  const s = center.scale;

  // Pint glass (left) — tapered pilsner shape
  const pintTopY = center.cy - 260 * s;
  const pintBotY = center.cy + 60 * s;
  const pintTopHalf = 90 * s;
  const pintBotHalf = 65 * s;
  const pintCx = center.cx - 110 * s;
  const beerTopY = pintTopY + 14 * s;
  const beerBotY = pintBotY - 6 * s;

  // Highball (right) — straight-sided rocks glass
  const rockTopY = center.cy - 220 * s;
  const rockBotY = center.cy + 60 * s;
  const rockHalf = 78 * s;
  const rockCx = center.cx + 115 * s;

  const glowX = (center.cx / W) * 100;
  const glowY = (center.cy / H) * 100;

  return (
    <div style={containerStyle({ background: BRAND.oxford, color: "#fff" })}>
      {/* Warm coquelicot radial glow behind the glasses */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at ${glowX}% ${glowY}%, ${BRAND.coquelicot}40 0%, transparent 50%)`,
      }} />

      <svg viewBox={vb} style={svgFillStyle}>
        <defs>
          <pattern id={`bbdots-${mode}`} x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={BRAND.cambridge} opacity="0.12" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#bbdots-${mode})`} />

        {/* "Clink" spark lines between the glasses */}
        <g stroke={BRAND.coquelicot} strokeWidth={isStory ? 5 : 3.5} strokeLinecap="round" fill="none">
          <path d={`M ${center.cx} ${pintTopY + 40 * s} l ${-18 * s} ${-28 * s}`} />
          <path d={`M ${center.cx + 18 * s} ${pintTopY + 30 * s} l ${14 * s} ${-24 * s}`} />
          <path d={`M ${center.cx - 8 * s} ${pintTopY + 70 * s} l ${-26 * s} ${4 * s}`} />
          <path d={`M ${center.cx + 22 * s} ${pintTopY + 65 * s} l ${26 * s} ${2 * s}`} />
          <circle
            cx={center.cx}
            cy={pintTopY + 44 * s}
            r={isStory ? 8 : 5}
            fill={BRAND.coquelicot}
            stroke="none"
          />
        </g>

        {/* ── Pint glass (left, tilted -8°) ── */}
        <g transform={`rotate(-8 ${pintCx} ${pintBotY})`}>
          {/* Amber beer liquid */}
          <path
            d={`M ${pintCx - pintTopHalf + 6 * s} ${beerTopY}
                L ${pintCx + pintTopHalf - 6 * s} ${beerTopY}
                L ${pintCx + pintBotHalf - 4 * s} ${beerBotY}
                L ${pintCx - pintBotHalf + 4 * s} ${beerBotY} Z`}
            fill="#E8A13A"
          />
          {/* Liquid shine */}
          <rect
            x={pintCx - pintTopHalf + 20 * s}
            y={beerTopY + 20 * s}
            width={8 * s}
            height={180 * s}
            fill="rgba(255,255,255,0.22)"
            rx={3 * s}
          />

          {/* Foam head — four overlapping ellipses */}
          <ellipse cx={pintCx}                              cy={beerTopY + 4 * s}   rx={pintTopHalf - 4 * s}  ry={14 * s} fill="#FFF5DC" />
          <ellipse cx={pintCx - pintTopHalf * 0.45}         cy={beerTopY - 8 * s}   rx={18 * s}               ry={14 * s} fill="#FFF5DC" />
          <ellipse cx={pintCx + pintTopHalf * 0.2}          cy={beerTopY - 14 * s}  rx={22 * s}               ry={16 * s} fill="#FFF5DC" />
          <ellipse cx={pintCx + pintTopHalf * 0.5}          cy={beerTopY - 6 * s}   rx={14 * s}               ry={12 * s} fill="#FFF5DC" />

          {/* Glass outline */}
          <path
            d={`M ${pintCx - pintTopHalf} ${pintTopY}
                L ${pintCx + pintTopHalf} ${pintTopY}
                L ${pintCx + pintBotHalf} ${pintBotY}
                L ${pintCx - pintBotHalf} ${pintBotY} Z`}
            fill="none"
            stroke="#fff"
            strokeWidth={isStory ? 6 : 4}
            strokeLinejoin="round"
          />

          {/* Bubbles */}
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={pintCx + (i % 2 ? -18 : 20) * s + (i * 6 - 14) * s}
              cy={beerTopY + (30 + i * 38) * s}
              r={(3 + (i % 3)) * s}
              fill="rgba(255,255,255,0.6)"
            />
          ))}
        </g>

        {/* ── Highball glass (right, tilted +8°) ── */}
        <g transform={`rotate(8 ${rockCx} ${rockBotY})`}>
          {/* Coquelicot cocktail */}
          <rect
            x={rockCx - rockHalf + 6 * s}
            y={rockTopY + 60 * s}
            width={(rockHalf - 6 * s) * 2}
            height={rockBotY - rockTopY - 66 * s}
            fill={BRAND.coquelicot}
          />
          {/* Liquid surface ellipse */}
          <ellipse
            cx={rockCx}
            cy={rockTopY + 60 * s}
            rx={rockHalf - 6 * s}
            ry={10 * s}
            fill="#FF6633"
          />
          {/* Liquid shine */}
          <rect
            x={rockCx - rockHalf + 16 * s}
            y={rockTopY + 80 * s}
            width={6 * s}
            height={150 * s}
            fill="rgba(255,255,255,0.3)"
            rx={3 * s}
          />

          {/* Ice cubes */}
          <rect
            x={rockCx - 32 * s}
            y={rockTopY + 30 * s}
            width={44 * s}
            height={44 * s}
            fill="rgba(255,255,255,0.55)"
            stroke="#fff"
            strokeWidth={2 * s}
            rx={4 * s}
            transform={`rotate(-6 ${rockCx - 10 * s} ${rockTopY + 52 * s})`}
          />
          <rect
            x={rockCx - 6 * s}
            y={rockTopY + 58 * s}
            width={38 * s}
            height={38 * s}
            fill="rgba(255,255,255,0.4)"
            stroke="#fff"
            strokeWidth={2 * s}
            rx={4 * s}
            transform={`rotate(12 ${rockCx + 13 * s} ${rockTopY + 77 * s})`}
          />

          {/* Citrus wedge on the rim */}
          <g transform={`translate(${rockCx + rockHalf - 10 * s} ${rockTopY - 4 * s})`}>
            <circle r={18 * s} fill="#FFD542" stroke="#fff" strokeWidth={2 * s} />
            <circle r={14 * s} fill="#FFE57A" />
            <path
              d={`M 0 ${-12 * s} L 0 ${12 * s} M ${-12 * s} 0 L ${12 * s} 0
                  M ${-8 * s} ${-8 * s} L ${8 * s} ${8 * s} M ${-8 * s} ${8 * s} L ${8 * s} ${-8 * s}`}
              stroke="#fff"
              strokeWidth={1.5 * s}
            />
          </g>

          {/* Glass outline — straight-sided */}
          <rect
            x={rockCx - rockHalf}
            y={rockTopY}
            width={rockHalf * 2}
            height={rockBotY - rockTopY}
            fill="none"
            stroke="#fff"
            strokeWidth={isStory ? 6 : 4}
            strokeLinejoin="round"
            rx={4 * s}
          />
        </g>

        {/* Shadows under each glass */}
        <ellipse
          cx={pintCx}
          cy={pintBotY + 10 * s}
          rx={pintBotHalf + 14 * s}
          ry={8 * s}
          fill="rgba(0,0,0,0.35)"
          transform={`rotate(-8 ${pintCx} ${pintBotY})`}
        />
        <ellipse
          cx={rockCx}
          cy={rockBotY + 10 * s}
          rx={rockHalf + 10 * s}
          ry={8 * s}
          fill="rgba(0,0,0,0.35)"
          transform={`rotate(8 ${rockCx} ${rockBotY})`}
        />
      </svg>

      {/* Content layer */}
      <div style={{
        position: "relative", zIndex: 2, height: "100%",
        padding: isStory ? "110px 72px 100px" : isSquare ? "72px 64px" : "56px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconWhite} style={{ height: isStory ? 60 : 44 }} alt="" />
        </div>

        <div style={{ maxWidth: isStory ? 720 : isSquare ? 620 : 640 }}>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.86,
            letterSpacing: "-0.045em", color: "#fff",
          }}>Business</div>
          <div style={{
            fontSize: titleSize, fontWeight: 700, lineHeight: 0.86,
            letterSpacing: "-0.045em", color: BRAND.coquelicot, marginTop: -8,
          }}>Brew</div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   10 — GET TO KNOW THE CHAMBER
   Cambridge field, dashed map grid, full compass SVG, 3-line stacked title.
   ============================================================================ */

export function GetToKnowGraphic({ mode = "social" }: { mode?: GraphicMode }) {
  const isStory = mode === "story";
  const isSquare = mode === "square";

  const titleSize = pick([150, 180, 220] as const, mode);
  const vb = isStory ? "0 0 1080 1920" : isSquare ? "0 0 1080 1080" : "0 0 1200 630";
  const W = isStory ? 1080 : isSquare ? 1080 : 1200;
  const H = isStory ? 1920 : isSquare ? 1080 : 630;

  const comp = isStory
    ? { cx: 800, cy: 1480, r: 200 }
    : isSquare
    ? { cx: 820, cy: 780,  r: 180 }
    : { cx: 970, cy: 340,  r: 170 };

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
        position: "relative", height: "100%",
        padding: isStory ? "110px 72px 100px" : isSquare ? "72px 64px" : "56px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASSETS.iconOrange} style={{ height: isStory ? 60 : 44 }} alt="" />
        </div>

        <div style={{ maxWidth: isStory ? 720 : isSquare ? 620 : 640 }}>
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
        </div>
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
}: {
  mode?: GraphicMode;
  topic?: string;
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
        padding: isStory ? "110px 72px 100px" : isSquare ? "72px 64px" : "56px 64px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
   Shared style helpers
   ============================================================================ */

function containerStyle({ background, color }: { background: string; color: string }): CSSProperties {
  return {
    width: "100%",
    height: "100%",
    position: "relative",
    background,
    color,
    overflow: "hidden",
    fontFamily: FONT_STACK,
  };
}

const svgFillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/* =============================================================================
   Registry — ordered so the showcase page can iterate.
   ============================================================================ */

export interface EventGraphicEntry {
  key: string;
  title: string;
  palette: "dark" | "light";
  Component: React.ComponentType<{ mode?: GraphicMode }>;
}

/* =============================================================================
   EVENT → GRAPHIC routing
   Maps a chamber event (by slug + optional title) to the right graphic
   component. Returns a plain `{ mode }`-accepting component so callers
   don't need to think about per-graphic props — for Eggs & Expertise
   the monthly topic is auto-extracted from the slug suffix and bound
   into a wrapper.
   ============================================================================ */

export interface EventLike {
  slug: string;
  title?: string;
}

export function getEventGraphicRenderer(
  event: EventLike,
): React.ComponentType<{ mode?: GraphicMode }> | null {
  const s = event.slug.toLowerCase();
  const t = (event.title ?? "").toLowerCase();

  if (s.includes("golf") || t.includes("golf")) return GolfOutingGraphic;
  if (s.includes("athena") || t.includes("athena")) return AthenaAwardsGraphic;
  if (s.includes("ribbon") || t.includes("ribbon cutting")) return RibbonCuttingGraphic;
  if (s.includes("social-connect") || t.includes("social connect")) return SocialConnectGraphic;
  if (s.startsWith("networking-wow") || t.includes("networking wow")) return NetworkingWowGraphic;
  if (s.startsWith("safety-council")) return SafetyCouncilGraphic;
  if (s.startsWith("chamber-chat")) return ChamberChatGraphic;
  if (s.startsWith("business-brew")) return BusinessBrewGraphic;
  if (
    s.startsWith("chamber-member-meeting") ||
    s.startsWith("member-meeting") ||
    t.includes("member meeting")
  ) {
    return MemberMeetingGraphic;
  }
  if (s.startsWith("get-to-know")) return GetToKnowGraphic;
  if (s.startsWith("eggs-expertise")) {
    // Slug suffix carries the topic: "eggs-expertise-canva-101" → "Canva 101"
    const suffix = s.replace(/^eggs-expertise-?/, "");
    if (!suffix) return EggsExpertiseGraphic;
    const topic = suffix
      .split("-")
      .map((w) => (/^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ");
    const BoundEggs: React.FC<{ mode?: GraphicMode }> = (props) => (
      <EggsExpertiseGraphic {...props} topic={topic} />
    );
    BoundEggs.displayName = `EggsExpertiseGraphic(${topic})`;
    return BoundEggs;
  }
  return null;
}

export const EVENT_GRAPHICS: EventGraphicEntry[] = [
  { key: "networking-wow",  title: "Networking WOW",         palette: "dark",  Component: NetworkingWowGraphic },
  { key: "safety-council",  title: "Safety Council",         palette: "dark",  Component: SafetyCouncilGraphic },
  { key: "chamber-chat",    title: "Chamber Chat",           palette: "dark",  Component: ChamberChatGraphic },
  { key: "member-meeting",  title: "Member Meeting",         palette: "light", Component: MemberMeetingGraphic },
  { key: "golf-outing",     title: "Golf Outing",            palette: "light", Component: GolfOutingGraphic },
  { key: "athena-awards",   title: "Athena Awards",          palette: "dark",  Component: AthenaAwardsGraphic },
  { key: "social-connect",  title: "Social Connect",         palette: "dark",  Component: SocialConnectGraphic },
  { key: "ribbon-cutting",  title: "Ribbon Cutting",         palette: "light", Component: RibbonCuttingGraphic },
  { key: "business-brew",   title: "Business Brew",          palette: "light", Component: BusinessBrewGraphic },
  { key: "get-to-know",     title: "Get to Know the Chamber", palette: "light", Component: GetToKnowGraphic },
  { key: "eggs-expertise",  title: "Eggs & Expertise",       palette: "dark",  Component: EggsExpertiseGraphic },
];

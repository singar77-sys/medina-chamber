/**
 * DynamicGraphic — renders a GraphicConfig (AI-generated template) as a
 * React component matching the existing EventGraphic interface.
 *
 * All config values use percentage-based positioning (0-100 maps to 0-100%
 * of the canvas dimensions for the current mode) so the same config renders
 * cleanly at social (1200×630), square (1080×1080), and story (1080×1920).
 */

import { useId, type CSSProperties } from "react";
import {
  BRAND,
  ASSETS,
  FONT_STACK,
  SCRIPT_STACK,
  containerStyle,
  svgFillStyle,
  GRAPHIC_DIMS,
  type EventInfo,
  type GraphicMode,
} from "./shared";
import type {
  GraphicConfig,
  GraphicConfigShape,
  PatternType,
} from "@/lib/graphic-template";

// ── Deterministic star field (module-level, computed once) ────────────────────

const STARS = (() => {
  let s = 42;
  const next = () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
  return Array.from({ length: 220 }, () => ({
    x: next() * 100,
    y: next() * 100,
    r: 0.4 + next() * 1.4,
    op: 0.25 + next() * 0.75,
  }));
})();

// ── Pattern SVG defs ──────────────────────────────────────────────────────────

function PatternDef({
  pattern,
  color,
  id,
}: {
  pattern: PatternType;
  color: string;
  id: string;
}) {
  if (pattern === "grid") {
    return (
      <pattern id={id} width="60" height="60" patternUnits="userSpaceOnUse">
        <path d="M 60 0 L 0 0 0 60" fill="none" stroke={color} strokeWidth="0.6" />
      </pattern>
    );
  }
  if (pattern === "honeycomb") {
    return (
      <pattern id={id} x="0" y="0" width="64" height="56" patternUnits="userSpaceOnUse">
        <path
          d="M 32 0 L 64 16 L 64 40 L 32 56 L 0 40 L 0 16 Z"
          fill="none"
          stroke={color}
          strokeWidth="1"
        />
      </pattern>
    );
  }
  if (pattern === "scanlines") {
    return (
      <pattern id={id} width="2" height="8" patternUnits="userSpaceOnUse">
        <rect x="0" y="0" width="2" height="1" fill={color} />
      </pattern>
    );
  }
  if (pattern === "dots") {
    return (
      <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse">
        <circle cx="18" cy="18" r="1.8" fill={color} />
      </pattern>
    );
  }
  return null;
}

// ── Shape renderer ────────────────────────────────────────────────────────────

function Shape({
  shape,
  index,
  W,
  H,
}: {
  shape: GraphicConfigShape;
  index: number;
  W: number;
  H: number;
}) {
  const strokeW = shape.strokeWidth != null ? shape.strokeWidth * W : 1.5;

  if (shape.type === "circle" || shape.type === "ring") {
    const cx = (shape.cx ?? 50) / 100 * W;
    const cy = (shape.cy ?? 50) / 100 * H;
    const r = (shape.r ?? 20) / 100 * W;
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={r}
        fill={shape.fill ? shape.color : "none"}
        stroke={shape.fill ? "none" : shape.color}
        strokeWidth={strokeW}
        opacity={shape.opacity}
      />
    );
  }
  if (shape.type === "line") {
    return (
      <line
        key={index}
        x1={(shape.x1 ?? 0) / 100 * W}
        y1={(shape.y1 ?? 0) / 100 * H}
        x2={(shape.x2 ?? 100) / 100 * W}
        y2={(shape.y2 ?? 0) / 100 * H}
        stroke={shape.color}
        strokeWidth={strokeW}
        opacity={shape.opacity}
      />
    );
  }
  if (shape.type === "rect") {
    const x = (shape.x ?? 0) / 100 * W;
    const y = (shape.y ?? 0) / 100 * H;
    const w = (shape.w ?? 10) / 100 * W;
    const h = (shape.h ?? 10) / 100 * H;
    return (
      <rect
        key={index}
        x={x}
        y={y}
        width={w}
        height={h}
        fill={shape.fill ? shape.color : "none"}
        stroke={shape.fill ? "none" : shape.color}
        strokeWidth={strokeW}
        opacity={shape.opacity}
      />
    );
  }
  return null;
}

// ── Event info plinth ─────────────────────────────────────────────────────────

function DynamicPlinth({
  eventInfo,
  W,
  H,
}: {
  eventInfo: EventInfo;
  W: number;
  H: number;
}) {
  const pad = W * 0.05;
  const labelSz = H * 0.033;
  const timeSz = H * 0.05;

  const dateLine = eventInfo.dayOfWeek && eventInfo.month && eventInfo.day
    ? [
        eventInfo.dayOfWeek.substring(0, 3).toUpperCase(),
        `${eventInfo.month.toUpperCase()} ${eventInfo.day}${eventInfo.year ? `, ${eventInfo.year}` : ""}`,
      ].join(" · ")
    : null;

  if (!dateLine && !eventInfo.time && !eventInfo.note) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: H * 0.18,
        padding: `0 ${pad}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: `1px solid ${BRAND.cambridge}55`,
        background: "rgba(12, 27, 51, 0.75)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div>
        {dateLine && (
          <div
            style={{
              fontSize: labelSz,
              fontFamily: FONT_STACK,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: BRAND.cambridge,
            }}
          >
            {dateLine}
          </div>
        )}
        {eventInfo.time && (
          <div
            style={{
              fontSize: timeSz,
              fontFamily: FONT_STACK,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#fff",
              marginTop: 4,
            }}
          >
            {eventInfo.time}
          </div>
        )}
      </div>
      {eventInfo.note && (
        <div
          style={{
            fontSize: labelSz,
            fontFamily: FONT_STACK,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: BRAND.coquelicot,
            textAlign: "right",
          }}
        >
          {eventInfo.note}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DynamicGraphic({
  config,
  mode = "social",
  eventInfo,
}: {
  config: GraphicConfig;
  mode?: GraphicMode;
  eventInfo?: EventInfo;
}) {
  const { w: W, h: H } = GRAPHIC_DIMS[mode];
  const { background, glows, headline, shapes, logo, subtitle } = config;

  // Background CSS
  let bgColor = background.color;
  if (background.gradient) {
    const g = background.gradient;
    if (g.type === "linear") {
      bgColor = `linear-gradient(${g.angle ?? 135}deg, ${g.from}, ${g.to})`;
    } else {
      bgColor = `radial-gradient(circle at ${g.cx ?? 50}% ${g.cy ?? 50}%, ${g.from}, ${g.to})`;
    }
  }

  // Headline computed values
  const hFontSz = headline.size * H;
  const hFontFamily = headline.fontStyle === "script" ? SCRIPT_STACK : FONT_STACK;
  const hFontWeight = headline.weight === "black" ? 900 : headline.weight === "bold" ? 700 : 400;
  const hLetterSpacing: Record<string, string> = {
    tight: "-0.04em",
    normal: "0.02em",
    wide: "0.12em",
    "ultra-wide": "0.25em",
  };

  const headlineStyle: CSSProperties = {
    position: "absolute",
    top: headline.y / 100 * H,
    fontFamily: hFontFamily,
    fontSize: hFontSz,
    fontWeight: hFontWeight,
    letterSpacing: hLetterSpacing[headline.tracking] ?? "0.02em",
    color: headline.color,
    lineHeight: 1.0,
    textTransform: headline.uppercase ? "uppercase" : "none",
    textAlign: headline.align,
    whiteSpace: "nowrap",
    ...(headline.align === "center"
      ? { left: headline.x / 100 * W, transform: "translateX(-50%)" }
      : headline.align === "right"
      ? { right: (100 - headline.x) / 100 * W }
      : { left: headline.x / 100 * W }),
  };

  // Logo
  const logoSrcMap: Record<string, string> = {
    white: ASSETS.iconWhite,
    orange: ASSETS.iconOrange,
    green: ASSETS.iconGreen,
  };
  const logoSizePx = logo.size * W;
  const logoXPx = logo.x / 100 * W;
  const logoYPx = logo.y / 100 * H;

  // Subtitle
  const subStyle: CSSProperties | null = subtitle
    ? {
        position: "absolute",
        left: subtitle.x / 100 * W,
        top: subtitle.y / 100 * H,
        fontFamily: FONT_STACK,
        fontSize: subtitle.size * H,
        fontWeight: 600,
        color: subtitle.color,
        letterSpacing: subtitle.tracking === "wide" ? "0.14em" : "0.05em",
        textTransform: subtitle.uppercase ? "uppercase" : "none",
        whiteSpace: "nowrap",
      }
    : null;

  // SVG def ids — namespaced per instance (not just per mode) so multiple
  // DynamicGraphics on one page (e.g. the admin template list) don't all
  // resolve url(#...) to the first instance's defs. React 19 useId emits
  // guillemet-wrapped ids («r0»), so strip non-safe chars before embedding.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `dg-grad-${mode}-${uid}`;
  const patId = `dg-pat-${mode}-${uid}`;
  const hasGradient = !!background.gradient;
  const hasPattern =
    background.pattern && background.pattern !== "none" && background.pattern !== "stars";
  const hasStars = background.pattern === "stars";

  return (
    <div style={containerStyle({ background: bgColor, color: "#fff" })}>
      {/* SVG layer — patterns, glows, shapes */}
      <svg viewBox={`0 0 ${W} ${H}`} style={svgFillStyle}>
        <defs>
          {hasGradient && background.gradient && (
            background.gradient.type === "linear" ? (
              <linearGradient
                id={gradId}
                gradientTransform={`rotate(${background.gradient.angle ?? 135})`}
              >
                <stop offset="0%" stopColor={background.gradient.from} />
                <stop offset="100%" stopColor={background.gradient.to} />
              </linearGradient>
            ) : (
              <radialGradient
                id={gradId}
                cx={`${background.gradient.cx ?? 50}%`}
                cy={`${background.gradient.cy ?? 50}%`}
                r="60%"
              >
                <stop offset="0%" stopColor={background.gradient.from} />
                <stop offset="100%" stopColor={background.gradient.to} />
              </radialGradient>
            )
          )}

          {glows?.map((g, i) => (
            <radialGradient
              key={i}
              id={`dg-glow-${mode}-${uid}-${i}`}
              cx={`${g.cx}%`}
              cy={`${g.cy}%`}
              r={`${g.radius}%`}
            >
              <stop offset="0%" stopColor={g.color} stopOpacity={g.opacity} />
              <stop offset="60%" stopColor={g.color} stopOpacity={g.opacity * 0.3} />
              <stop offset="100%" stopColor={g.color} stopOpacity="0" />
            </radialGradient>
          ))}

          {hasPattern && (
            <PatternDef
              pattern={background.pattern!}
              color={background.patternColor ?? "#ffffff"}
              id={patId}
            />
          )}
        </defs>

        {/* Gradient rect (if gradient overrides solid color) */}
        {hasGradient && <rect width={W} height={H} fill={`url(#${gradId})`} />}

        {/* Pattern fill */}
        {hasPattern && (
          <rect
            width={W}
            height={H}
            fill={`url(#${patId})`}
            opacity={background.patternOpacity ?? 0.25}
          />
        )}

        {/* Star field */}
        {hasStars && (
          <g opacity={background.patternOpacity ?? 0.55}>
            {STARS.map((star, i) => (
              <circle
                key={i}
                cx={(star.x / 100) * W}
                cy={(star.y / 100) * H}
                r={star.r}
                fill={background.patternColor ?? "#ffffff"}
                opacity={star.op}
              />
            ))}
          </g>
        )}

        {/* Atmospheric glows */}
        {glows?.map((_, i) => (
          <rect key={i} width={W} height={H} fill={`url(#dg-glow-${mode}-${uid}-${i})`} />
        ))}

        {/* Decorative shapes */}
        {shapes?.map((shape, i) => (
          <Shape key={i} shape={shape} index={i} W={W} H={H} />
        ))}
      </svg>

      {/* Content layer */}
      <div style={{ position: "absolute", inset: 0 }}>
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrcMap[logo.variant] ?? ASSETS.iconWhite}
          alt=""
          style={{
            position: "absolute",
            left: logoXPx,
            top: logoYPx,
            width: logoSizePx,
            height: logoSizePx,
            objectFit: "contain",
          }}
        />

        {/* Subtitle */}
        {subtitle && subStyle && <div style={subStyle}>{subtitle.text}</div>}

        {/* Headline */}
        <div style={headlineStyle}>
          {headline.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* Event info plinth */}
        {eventInfo && <DynamicPlinth eventInfo={eventInfo} W={W} H={H} />}
      </div>
    </div>
  );
}

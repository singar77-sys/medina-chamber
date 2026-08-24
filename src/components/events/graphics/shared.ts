/**
 * Event-graphic primitives — types, brand tokens, asset URLs, and layout
 * helpers shared across every chamber event graphic.
 *
 * Deliberately NOT tied to globals.css tokens. These graphics render at
 * fixed pixel dimensions for social export, and a theme-token drift (or
 * a user-selected dark mode) shouldn't change what Instagram sees.
 * Brand hex stays literal.
 */

import type { CSSProperties } from "react";

export type GraphicMode = "social" | "square" | "story";

/** Canvas dimensions per mode — the "design-intent" pixels each graphic
 *  renders into. Display-time scaling is handled by <FluidGraphicFrame/>. */
export const GRAPHIC_DIMS: Record<GraphicMode, { w: number; h: number }> = {
  social: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
  story:  { w: 1080, h: 1920 },
};

/** Literal brand hex — do not swap for CSS variables. */
export const BRAND = {
  oxford:     "#0C1B33",
  cambridge:  "#83BCA9",
  coquelicot: "#FF4000",
  emerald:    "#005450",
  cream:      "#F4EFE6",
  paper:      "#F7F5EF",
} as const;

/** Asset URLs — live under public/. Used as background-image or <img src>. */
export const ASSETS = {
  iconWhite:       "/images/chamber-logos/icon-white.png",
  iconOrange:      "/images/chamber-logos/icon-orange.png",
  iconGreen:       "/images/chamber-logos/icon-green.png",
  stampOrange:     "/images/chamber-logos/stamp-orange.png",
  stampTeal:       "/images/chamber-logos/stamp-teal.png",
  networking:      "/images/events/networking.webp",
  networkingPeople:"/images/events/networking-people.webp",
  getToKnow:       "/images/events/get-to-know.webp",
  golf01:          "/images/events/golf-outing/golf-outing-medina-chamber-001.webp",
  golf03:          "/images/events/golf-outing/golf-outing-medina-chamber-002.webp",
  golfFoursome:    "/images/events/golf-outing/golf-outing-medina-chamber-003.webp",
  athena04:        "/images/events/athena-awards/athena-awards-medina-ohio-extra-001.webp",
  social03:        "/images/events/social-connect/social-connect-networking-medina-chamber-013.webp",
  chamberBuilding: "/images/events/chamber-building.webp",
  industryMedina:  "/images/events/industry-medina.jpg",
  businessBrewLogo:"/images/events/business-brew/business-brew-networking-medina-chamber-013.webp",
  // Official designed artwork (2026-08) — full-frame 16:9 graphics that ARE
  // the Networking WOW / Chamber Chat visuals, not background textures.
  networkingWowArt:"/images/events/networking-wow-official.webp",
  chamberChatArt:  "/images/events/chamber-chat-official.webp",
  safetyCouncilArt:"/images/events/safety-council-official.webp",
} as const;

export const FONT_STACK = '"BN Bergen", system-ui, -apple-system, sans-serif';
export const SCRIPT_STACK = '"Mistrully", "Brush Script MT", cursive';

/** Pick the right value for the current mode from a 3-tuple [social, square, story]. */
export function pick<T>(values: readonly [T, T, T], mode: GraphicMode): T {
  return mode === "social" ? values[0] : mode === "square" ? values[1] : values[2];
}

/**
 * Optional per-event info a graphic can render when bound to a specific
 * upcoming event instance. Used for the "REGISTRATION REQUIRED" plinth
 * at the bottom of the social/square frames. Omitted → graphic renders
 * as the generic template.
 */
export interface EventInfo {
  dayOfWeek?: string;
  month?: string;
  day?: number;
  year?: number;
  time?: string;
  note?: string;
  venue?: string;
  address?: string;
}

/** Outer container style shared by every graphic — full-bleed, positioned
 *  for absolutely-positioned children, brand-font by default. */
export function containerStyle({
  background,
  color,
}: {
  background: string;
  color: string;
}): CSSProperties {
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

/** SVG layer that fills the container — used as the background layer
 *  underneath the content-layer div in every graphic. */
export const svgFillStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

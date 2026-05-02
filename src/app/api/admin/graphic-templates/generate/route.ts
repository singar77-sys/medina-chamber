/**
 * POST /api/admin/graphic-templates/generate
 *
 * Generates a GraphicConfig from a style prompt using Claude.
 * Returns the config for preview — does NOT save to Redis.
 * The client calls the CRUD route separately to save.
 *
 * Request:  { eventTypeSlug: string, stylePrompt: string }
 * Response: { config: GraphicConfigDraft }
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { GraphicConfigDraft } from "@/lib/graphic-template";

export const dynamic = "force-dynamic";

const SYSTEM = `You are a social graphic designer for the Greater Medina Chamber of Commerce.
You generate graphic template configurations for chamber event social media posts.

Given an event type and a style prompt, return a JSON GraphicConfig object that controls the visual design.
The graphic renders at 1200×630px (social), 1080×1080 (square), or 1080×1920 (story).
All positions use a 0-100 scale (percentage of canvas dimensions).

BRAND CONSTRAINTS, non-negotiable:
- Brand colors: oxford "#0C1B33", cambridge "#83BCA9", coquelicot "#FF4000", emerald "#005450", cream "#F4EFE6"
- Headlines must use a brand color, white "#ffffff", or cream "#F4EFE6"
- The logo MUST appear, place it clearly and legibly
- Logo variants: "white" (dark backgrounds), "orange" (medium/mixed), "green" (light/cream backgrounds)
- Font "sans" = BN Bergen (brand sans-serif, bold/industrial feel)
- Font "script" = Mistrully (brand script, handwritten feel)
- Leave the bottom ~18% of height empty, that's where event date/time renders

GRAPHIC CONFIG SCHEMA, return ONLY this JSON object, no markdown:
{
  "name": string,           // e.g. "Chamber Chat, Star Wars Edition"
  "eventTypeSlug": string,  // same as provided
  "stylePrompt": string,    // same as provided

  "background": {
    "color": string,        // base hex color
    "pattern": "none"|"grid"|"honeycomb"|"stars"|"scanlines"|"dots",
    "patternColor": string, // hex
    "patternOpacity": number, // 0.0-1.0
    "gradient": {           // optional, overrides solid color
      "type": "radial"|"linear",
      "from": string, "to": string,
      "angle": number,      // degrees (linear only)
      "cx": number, "cy": number  // 0-100 (radial only)
    }
  },

  "glows": [               // optional atmospheric effects, 0-3 items
    { "color": string, "cx": number, "cy": number, "radius": number, "opacity": number }
  ],

  "headline": {
    "lines": string[],     // 1-3 lines, e.g. ["CHAMBER", "CHAT"]
    "color": string,
    "size": number,        // fraction of canvas HEIGHT, e.g. 0.28 (try 0.20-0.38)
    "fontStyle": "sans"|"script",
    "tracking": "tight"|"normal"|"wide"|"ultra-wide",
    "weight": "normal"|"bold"|"black",
    "x": number,           // position %. left-align: left edge. center: center point. right: right edge.
    "y": number,           // % from top (top of first line; keep above 15 to avoid logo)
    "align": "left"|"center"|"right",
    "uppercase": boolean
  },

  "shapes": [              // optional decorative SVG elements, 0-6 items
    {
      "type": "circle"|"ring"|"line"|"rect",
      "cx": number, "cy": number, "r": number,   // circle/ring: center+radius (% of canvas width)
      "x1": number, "y1": number, "x2": number, "y2": number,  // line
      "x": number, "y": number, "w": number, "h": number,      // rect
      "color": string, "opacity": number,
      "fill": boolean,
      "strokeWidth": number  // % of canvas width, e.g. 0.003
    }
  ],

  "logo": {
    "variant": "white"|"orange"|"green",
    "x": number,   // top-left corner, % of canvas
    "y": number,
    "size": number // % of canvas WIDTH (0.05-0.09 typical)
  },

  "subtitle": {           // optional small label above or below headline
    "text": string,       // e.g. "GREATER MEDINA CHAMBER"
    "color": string,
    "size": number,       // fraction of HEIGHT, e.g. 0.038
    "x": number, "y": number,
    "tracking": "normal"|"wide",
    "uppercase": boolean
  }
}

DESIGN GUIDANCE:
- Dark background (oxford): use white or cambridge for text; logo variant "white"
- Light background (cream): use oxford for text; logo variant "green" or "orange"
- Style prompts like "Star Wars" → stars pattern, dark oxford base, geometric shapes, maybe a sci-fi glow
- Style prompts like "Art Deco" → grid pattern, ultra-wide tracking, geometric rectangles/lines
- Style prompts like "Retro 80s" → scanlines, gradient, cambridge/coquelicot palette
- Style prompts like "Nature/Organic" → honeycomb or dots, emerald base, script font accent
- Always include a subtitle with "GREATER MEDINA CHAMBER" or the event type name
- Shapes add depth, rings, lines, and rectangles work well as geometric accents
- Keep headline y position between 20-60 (leaves room for subtitle above and plinth below)

Return ONLY the JSON object. No code fences, no explanation.`;

export async function POST(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: { eventTypeSlug?: string; stylePrompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { eventTypeSlug, stylePrompt } = body;
  if (!eventTypeSlug || !stylePrompt) {
    return NextResponse.json({ error: "Missing eventTypeSlug or stylePrompt." }, { status: 400 });
  }

  const userPrompt = `Event type: "${eventTypeSlug}"
Style prompt: "${stylePrompt.trim()}"

Generate a GraphicConfig for this chamber event in the described style. Remember brand constraints, oxford, cambridge, coquelicot, cream are the brand colors. Be creative with the style but stay on-brand.`;

  let draft: GraphicConfigDraft;
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: SYSTEM,
      prompt: userPrompt,
      maxOutputTokens: 2048,
    });

    // Strip markdown code fences if model wraps output
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    draft = JSON.parse(cleaned);
  } catch (err) {
    console.error("[graphic-templates/generate] error:", err);
    return NextResponse.json({ error: "Failed to generate template. Try a different prompt." }, { status: 500 });
  }

  // Ensure required fields are present
  draft.eventTypeSlug = eventTypeSlug;
  draft.stylePrompt = stylePrompt;

  return NextResponse.json({ config: draft });
}

/**
 * Formats live chamber facts for injection into ChamberBot's system prompt.
 *
 * This is the bridge between the admin CMS and the bot. When pricing or
 * hours change in the admin, this function reads the updated values from
 * Redis and builds a small system block the bot treats as authoritative.
 *
 * Architecture:
 *   Admin saves pricing → Redis cms:pricing → this function → bot system prompt
 *   Same Redis key also feeds pricing/page.tsx → site shows correct price
 *
 * Caching: module-level, 5-min TTL. Works per edge isolate — acceptable for
 * data that changes at most a few times per year. Admin saves are reflected
 * within 5 minutes at worst.
 */

import { getCmsPricing, DEFAULT_PRICING, type PricingConfig } from "@/lib/cms-store";

const FACTS_TTL_MS = 5 * 60 * 1000;
let cached: { value: string | null; expiresAt: number } | null = null;

function buildBlock(pricing: Omit<PricingConfig, "updatedAt">): string {
  const e = pricing.tiers.find((t) => t.key === "essentials");
  const p = pricing.tiers.find((t) => t.key === "plus");
  const i = pricing.tiers.find((t) => t.key === "investor");
  if (!e || !p || !i) return "";

  return [
    "CURRENT MEMBERSHIP PRICING (authoritative — these values override any pricing mentioned earlier in this prompt):",
    `- ${e.name}: $${e.price.toLocaleString("en-US")}/year`,
    `- ${p.name}: $${p.price.toLocaleString("en-US")}/year`,
    `- ${i.name}: $${i.price.toLocaleString("en-US")}/year`,
    "Full tier comparison: medinachamber.com/membership/pricing",
  ].join("\n");
}

/**
 * Returns a short system block with live membership pricing for the bot.
 * Returns null only if something is deeply broken — callers should proceed
 * without the block rather than failing.
 */
export async function formatChamberFactsForPrompt(): Promise<string | null> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const cmsPricing = await getCmsPricing();
    const pricing = cmsPricing ?? DEFAULT_PRICING;
    const value = buildBlock(pricing);
    cached = { value: value || null, expiresAt: now + FACTS_TTL_MS };
    return cached.value;
  } catch {
    // Redis unavailable — serve default facts without caching
    // so the next request tries Redis again.
    return buildBlock(DEFAULT_PRICING);
  }
}

/** Call this after an admin save to bust the in-process cache immediately. */
export function bustChamberFactsCache(): void {
  cached = null;
}

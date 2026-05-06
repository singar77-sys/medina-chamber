/**
 * Formats live chamber facts for injection into ChamberBot's system prompt.
 *
 * Architecture:
 *   membership_tiers table (DB) → getActiveTiers() → this function → bot system prompt
 *   Same data feeds pricing/page.tsx — one source of truth.
 *
 * Caching: module-level, 5-min TTL. Works per edge isolate — acceptable for
 * data that changes at most a few times per year.
 */

import { getActiveTiers, type TierDisplay } from "@/lib/membership-tiers";

const FACTS_TTL_MS = 5 * 60 * 1000;
let cached: { value: string | null; expiresAt: number } | null = null;

function buildBlock(tiers: TierDisplay[]): string {
  if (tiers.length < 3) return "";
  // Tiers are sorted by sortOrder: standard, visibility_plus, community_investor
  return [
    "CURRENT MEMBERSHIP PRICING (authoritative, these values override any pricing mentioned earlier in this prompt):",
    ...tiers.map((t) => `- ${t.name}: $${t.price.toLocaleString("en-US")}/year`),
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
    const tiers = await getActiveTiers();
    const value = buildBlock(tiers);
    cached = { value: value || null, expiresAt: now + FACTS_TTL_MS };
    return cached.value;
  } catch {
    // DB unavailable — don't cache so the next request retries.
    return null;
  }
}

/** Call this after an admin save to bust the in-process cache immediately. */
export function bustChamberFactsCache(): void {
  cached = null;
}

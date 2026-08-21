/**
 * Shared enrichment helper. Applies src/data/member-overrides.json onto a
 * scraped members array in place, so curated categories/descriptions survive
 * the scraper's wholesale overwrite of members.json.
 *
 * Used by scripts/scrape-members.mjs (after every scrape) and
 * scripts/apply-member-overrides.mjs (standalone re-apply).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OVERRIDES_FILE = join(__dir, "..", "src", "data", "member-overrides.json");

export function loadOverrides() {
  return JSON.parse(readFileSync(OVERRIDES_FILE, "utf8")).overrides ?? {};
}

/**
 * Mutates `members` in place. Returns a report array of what changed.
 * - addCategories: merged onto existing categories, deduped, order preserved.
 * - description: replaces the member's description when the override provides one.
 */
export function applyMemberOverrides(members, overrides = loadOverrides()) {
  const report = [];
  for (const m of members) {
    const ov = overrides[m.chamberSlug];
    if (!ov) continue;
    const changes = [];

    if (Array.isArray(ov.addCategories) && ov.addCategories.length) {
      const existing = new Set(m.categories ?? []);
      const added = ov.addCategories.filter((c) => !existing.has(c));
      if (added.length) {
        m.categories = [...(m.categories ?? []), ...added];
        changes.push(`+categories ${JSON.stringify(added)}`);
      }
    }

    if (typeof ov.description === "string" && ov.description.trim()) {
      if (m.description !== ov.description) {
        m.description = ov.description;
        changes.push("description set");
      }
    }

    if (changes.length) report.push(`${m.chamberSlug}: ${changes.join(", ")}`);
  }
  return report;
}

/**
 * Member-directory category normalization.
 *
 * GrowthZone hands us ~215 raw member categories with many near-duplicates —
 * e.g. "Construction Company" and "Construction Companies, General
 * Contractors/Dev" are the same thing, but a business tagged with one does not
 * appear when a visitor clicks the other. This maps duplicate/variant labels to
 * a single canonical name so the browse chips and category filtering stop
 * fragmenting members across synonyms.
 *
 * Applied at READ time (see lib/directory.ts + the directory page), so it
 * survives the nightly gz-sync, which re-populates the raw category rows from
 * GrowthZone. To merge more duplicates, just add rows here — the canonical
 * (right-hand) value is what shows as the chip label.
 */
export const CATEGORY_ALIASES: Record<string, string> = {
  "Construction Company": "Construction & General Contractors",
  "Construction Companies, General Contractors/Dev": "Construction & General Contractors",
  "Construction Companies, Excavation, Concrete": "Construction & General Contractors",
};

export function normalizeCategory(name: string): string {
  return CATEGORY_ALIASES[name] ?? name;
}

/** Normalize + de-duplicate a member's category list, preserving order. */
export function normalizeCategories(cats: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of cats) {
    const n = normalizeCategory(c);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

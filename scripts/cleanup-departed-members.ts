/**
 * One-time cleanup: SOFT-DELETE organizations that have LEFT the chamber
 * (verified 2026-08-21 — their GrowthZone detail pages redirect to
 * MemberNotFound) plus the stale pre-rename King Dumpsters slug. gz-sync never
 * deletes, so departed members linger in the DB-backed directory grid.
 *
 * We set deleted_at (not a hard DELETE) because the invoices table references
 * organizations WITHOUT cascade — a hard delete of an org with invoice history
 * is (correctly) blocked, and we want to keep that history. The directory query
 * only shows `status='active' AND deleted_at IS NULL`, so soft-delete hides them.
 *
 * Dry-run (default):   pnpm tsx --env-file=.env.local scripts/cleanup-departed-members.ts
 * Apply:               pnpm tsx --env-file=.env.local scripts/cleanup-departed-members.ts --apply
 */
import { inArray, isNull, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

// 11 verified departures + the stale pre-rename "king-dumpsters" slug (the
// business stays as "king-dumpsters-medina", added by the next gz-sync).
const SLUGS = [
  "any-lab-test-now-medina",
  "clearwater-systems",
  "fifth-third-bank-barberton",
  "fifth-third-bank",
  "king-dumpsters",
  "lafayette-township",
  "medina-moose-lodge-647",
  "remembrance-hospice",
  "roofsmith-restoration",
  "rowleys-wholesale",
  "sweet-and-geeks",
  "unisand-incorporated",
];

const APPLY = process.argv.includes("--apply");

void (async () => {
  const found = await db
    .select({ id: organizations.id, name: organizations.name, slug: organizations.slug })
    .from(organizations)
    .where(inArray(organizations.slug, SLUGS));

  const foundSlugs = new Set(found.map((f) => f.slug));
  const missing = SLUGS.filter((s) => !foundSlugs.has(s));

  console.log(`Matched ${found.length}/${SLUGS.length} slugs in the DB:`);
  found.forEach((f) => console.log(`   - ${f.name}  [${f.slug}]`));
  if (missing.length) console.log(`Not in DB (already absent): ${missing.join(", ")}`);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --apply to remove these rows.");
    process.exit(0);
  }

  const removed = await db
    .update(organizations)
    .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(inArray(organizations.slug, SLUGS), isNull(organizations.deletedAt)))
    .returning({ slug: organizations.slug });

  console.log(`\n✅ Soft-deleted ${removed.length} organization(s) (hidden from directory, history kept):`);
  removed.forEach((r) => console.log(`   - ${r.slug}`));
  process.exit(0);
})();

/**
 * One-time cleanup: remove organizations that have LEFT the chamber (verified
 * 2026-08-21 — their GrowthZone detail pages redirect to MemberNotFound) plus
 * the stale pre-rename King Dumpsters slug. gz-sync intentionally never deletes,
 * so departed members linger in the DB-backed directory grid; this removes them.
 *
 * Dry-run (default):   pnpm tsx --env-file=.env.local scripts/cleanup-departed-members.ts
 * Apply the delete:    pnpm tsx --env-file=.env.local scripts/cleanup-departed-members.ts --apply
 *
 * FK-safe: every reference to organizations.id is ON DELETE CASCADE / SET NULL,
 * and the delete runs in a transaction, so a partial failure rolls back cleanly.
 */
import { inArray } from "drizzle-orm";
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

  const deleted = await db.transaction(async (tx) => {
    const res = await tx
      .delete(organizations)
      .where(inArray(organizations.slug, SLUGS))
      .returning({ slug: organizations.slug });
    return res.map((r) => r.slug);
  });

  console.log(`\n✅ Deleted ${deleted.length} organization(s) (cascaded to dependent rows):`);
  deleted.forEach((s) => console.log(`   - ${s}`));
  process.exit(0);
})();

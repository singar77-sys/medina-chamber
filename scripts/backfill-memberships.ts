/**
 * Backfills the memberships table for all 511 active GrowthZone orgs.
 *
 * Strategy:
 *   - Joins organizations.membership_tier → membership_tiers.slug
 *   - start_date:   2026-01-01  (current membership year placeholder)
 *   - renewal_date: 2027-01-01  (one year later)
 *   - status:       active
 *   - billing_cycle: annual
 *   - gz_id left null — we have org-level GZ IDs, not membership-level
 *
 * Safe to re-run: skips orgs that already have a membership row.
 *
 *   pnpm tsx --env-file=.env.local scripts/backfill-memberships.ts
 *   pnpm tsx --env-file=.env.local scripts/backfill-memberships.ts --dry-run
 */

import { db } from "@/lib/db";
import { organizations, memberships, membershipTiers } from "@/lib/db/schema";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;
const START_DATE = "2026-01-01";
const RENEWAL_DATE = "2027-01-01";

void (async () => {
  console.log(`\n${DRY_RUN ? "🔍  DRY RUN — " : ""}Membership backfill starting...\n`);

  // Load all tier slug → id mappings
  const tiers = await db
    .select({ id: membershipTiers.id, slug: membershipTiers.slug })
    .from(membershipTiers);

  const tierMap = Object.fromEntries(tiers.map((t) => [t.slug, t.id]));
  console.log("Tiers loaded:", Object.entries(tierMap).map(([s, id]) => `${s}→${id.slice(0, 8)}`).join(", "));

  // Find active orgs that have no membership row
  const unlinkedOrgs = await db.execute(sql`
    SELECT o.id, o.name, o.membership_tier
    FROM organizations o
    WHERE o.status = 'active'
      AND o.membership_tier IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM memberships m WHERE m.organization_id = o.id
      )
    ORDER BY o.name
  `);

  const orgs = unlinkedOrgs as unknown as Array<{ id: string; name: string; membership_tier: string }>;
  console.log(`Orgs needing a membership row: ${orgs.length}\n`);

  if (orgs.length === 0) {
    console.log("Nothing to do — all active orgs already have membership rows.");
    process.exit(0);
  }

  // Show tier breakdown of what we're about to insert
  const breakdown: Record<string, number> = {};
  for (const org of orgs) {
    breakdown[org.membership_tier] = (breakdown[org.membership_tier] ?? 0) + 1;
  }
  console.log("Breakdown by tier:");
  for (const [slug, count] of Object.entries(breakdown)) {
    const tierId = tierMap[slug];
    if (!tierId) {
      console.error(`  ❌  Unknown tier slug "${slug}" — ${count} orgs will be SKIPPED`);
    } else {
      console.log(`  ${slug}: ${count}`);
    }
  }
  console.log();

  if (DRY_RUN) {
    console.log("Dry run complete. Pass no flag to execute.");
    process.exit(0);
  }

  // Insert in batches
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < orgs.length; i += BATCH_SIZE) {
    const batch = orgs.slice(i, i + BATCH_SIZE);

    const rows = batch
      .map((org) => {
        const tierId = tierMap[org.membership_tier];
        if (!tierId) { skipped++; return null; }
        return {
          organizationId: org.id,
          tierId,
          status: "active" as const,
          billingCycle: "annual" as const,
          startDate: START_DATE,
          renewalDate: RENEWAL_DATE,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) continue;

    await db.insert(memberships).values(rows).onConflictDoNothing();
    inserted += rows.length;
    process.stdout.write(`  Inserted ${inserted}/${orgs.length - skipped}...\r`);
  }

  console.log(`\n✅  Done.`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (unknown tier): ${skipped}`);
  process.exit(0);
})();

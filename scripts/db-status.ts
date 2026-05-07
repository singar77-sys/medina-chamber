import { db } from "@/lib/db";
import { organizations, memberships, membershipTiers } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

void (async () => {
  const [membershipCount] = await db.execute(sql`
    SELECT count(*) FROM memberships
  `) as any[];

  const tierBreakdown = await db.execute(sql`
    SELECT t.slug, t.name, count(*) as count
    FROM memberships m
    JOIN membership_tiers t ON t.id = m.tier_id
    GROUP BY t.slug, t.name
    ORDER BY count DESC
  `);

  const [unlinked] = await db.execute(sql`
    SELECT count(*) FROM organizations o
    WHERE status = 'active'
    AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = o.id)
  `) as any[];

  console.log(`\nMEMBERSHIP ROWS: ${membershipCount.count}`);
  console.log("\nBY TIER:");
  for (const row of tierBreakdown as any[]) {
    console.log(`  ${row.slug} (${row.name}): ${row.count}`);
  }
  console.log(`\nACTIVE ORGS WITHOUT MEMBERSHIP: ${unlinked.count}`);

  process.exit(0);
})();

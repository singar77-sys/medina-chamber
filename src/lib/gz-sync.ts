/**
 * gz-sync — upserts bundled GrowthZone member data into Supabase.
 *
 * Source:      src/data/members.json, compiled into the bundle by the nightly
 *              GitHub Actions scrape → Vercel deploy cycle.
 * Destination: organizations, categories, organization_categories, sync_log.
 * Called by:   /api/cron/gz-sync (Vercel cron, nightly at 06:00 UTC).
 *
 * Contacts are NOT synced here. GrowthZone exposes contact-level data only
 * through its authenticated admin API (session cookies; no API key), so that
 * sync must remain a manual or separately authenticated step.
 *
 * Required env:
 *   DATABASE_URL — Supabase connection string (session pooler, port 5432)
 */

import { sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizations,
  categories,
  organizationCategories,
  syncLog,
} from "@/lib/db/schema";
import { members } from "@/data/members";
import {
  COMMUNITY_INVESTOR_SLUGS,
  VISIBILITY_PLUS_SLUGS,
} from "@/data/tier-overrides";

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function memberTier(chamberSlug: string): string {
  if (COMMUNITY_INVESTOR_SLUGS.has(chamberSlug)) return "community_investor";
  if (VISIBILITY_PLUS_SLUGS.has(chamberSlug)) return "visibility_plus";
  return "standard";
}

/** Splits the scraper's combined address string into structured fields. */
function parseAddress(raw: string): {
  address1: string | null;
  city: string;
  state: string;
  zip: string | null;
} {
  if (!raw) return { address1: null, city: "Medina", state: "OH", zip: null };
  // GZ emits "[street…], city, state, zip". Anchor on the trailing city/state/zip
  // (only treating the last token as a zip when it looks like one) so a missing
  // street line doesn't shift every field left — a positional split mapped
  // "Medina, OH, 44256" to street=Medina / state=44256, losing the real zip.
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const hasZip = parts.length > 0 && /^\d{5}(-\d{4})?$/.test(parts[parts.length - 1]);
  const zip = hasZip ? parts.pop()! : null;
  const state = parts.length >= 2 ? parts.pop()! : "OH";
  const city = parts.length >= 1 ? parts.pop()! : "Medina";
  const address1 = parts.length ? parts.join(", ") : null;
  return { address1, city: city || "Medina", state: state || "OH", zip: zip || null };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface SyncResult {
  /** Total member rows attempted. */
  added: number;
  updated: number;
  removed: number;
  errors: number;
  durationMs: number;
  errorDetails: Array<{ id: string; error: string }>;
}

/**
 * Runs a full GrowthZone → Supabase sync.
 *
 * The function is idempotent: calling it multiple times produces the same
 * result. All writes use ON CONFLICT DO UPDATE so re-runs are safe.
 *
 * Upsert key for organizations: slug (our canonical identifier).
 * Note: if a member's business name changes (new chamberSlug) while the
 * GrowthZone gz_id stays the same, the gz_id unique constraint may raise
 * a conflict. This edge case surfaces in errorDetails rather than silently
 * corrupting data — handle manually if it occurs.
 */
export async function runGzSync(): Promise<SyncResult> {
  const start = Date.now();
  const now = new Date();
  const errorDetails: Array<{ id: string; error: string }> = [];
  let synced = 0;
  let errors = 0;

  // ── 1. Upsert categories ───────────────────────────────────────────────────
  // Collect unique category names across all members.
  const uniqueCatNames = new Set<string>();
  for (const m of members) {
    for (const cat of m.categories) {
      if (cat?.trim()) uniqueCatNames.add(cat.trim());
    }
  }

  if (uniqueCatNames.size > 0) {
    const catRows = Array.from(uniqueCatNames).map((name) => ({
      name,
      slug: toSlug(name),
      sortOrder: 0,
    }));

    await db
      .insert(categories)
      .values(catRows)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: sql`excluded.name` },
      });
  }

  // Load full slug → id map (includes categories that existed before this run).
  const allCats = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
  const catSlugToId = new Map(allCats.map((c) => [c.slug, c.id]));

  // ── 2. Upsert organizations ────────────────────────────────────────────────
  const orgValues = members.map((m) => {
    const { address1, city, state, zip } = parseAddress(m.address);
    return {
      gzId: m.gzSlug || null,
      gzSyncedAt: now,
      name: m.name,
      slug: m.chamberSlug,
      status: "active" as const,
      phone: m.phone || null,
      websiteUrl: m.website || null,
      address1,
      city,
      state,
      zip,
      description: m.description || null,
      logoUrl: m.logoUrl || null,
      facebook: m.social?.facebook || null,
      twitter: m.social?.twitter || null,
      instagram: m.social?.instagram || null,
      linkedin: m.social?.linkedin || null,
      youtube: m.social?.youtube || null,
      membershipTier: memberTier(m.chamberSlug),
      updatedAt: now,
    };
  });

  // Upsert in batches of 50 to stay well under Postgres's 65 535-parameter limit.
  for (const batch of chunk(orgValues, 50)) {
    try {
      await db
        .insert(organizations)
        .values(batch)
        .onConflictDoUpdate({
          target: organizations.slug,
          set: {
            // Update every scraped field; preserve id, createdAt, stripeCustomerId,
            // latitude, longitude, address2, coverImageUrl (managed elsewhere).
            gzId:           sql`excluded.gz_id`,
            gzSyncedAt:     sql`excluded.gz_synced_at`,
            name:           sql`excluded.name`,
            status:         sql`excluded.status`,
            phone:          sql`excluded.phone`,
            websiteUrl:     sql`excluded.website_url`,
            address1:       sql`excluded.address1`,
            city:           sql`excluded.city`,
            state:          sql`excluded.state`,
            zip:            sql`excluded.zip`,
            description:    sql`excluded.description`,
            logoUrl:        sql`excluded.logo_url`,
            facebook:       sql`excluded.facebook`,
            twitter:        sql`excluded.twitter`,
            instagram:      sql`excluded.instagram`,
            linkedin:       sql`excluded.linkedin`,
            youtube:        sql`excluded.youtube`,
            membershipTier: sql`excluded.membership_tier`,
            updatedAt:      sql`excluded.updated_at`,
            // An org present in the current member scrape IS a member again —
            // clear any soft-delete from a past departure, otherwise a
            // re-joining member stays hidden from the directory forever.
            deletedAt:      null,
          },
        });

      synced += batch.length;
    } catch (err) {
      errors += batch.length;
      const first = batch[0].slug;
      const last = batch[batch.length - 1].slug;
      errorDetails.push({
        id: `orgs:${first}…${last}`,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 3. Sync organization_categories ───────────────────────────────────────
  // Fetch DB IDs for every org that was (or should have been) just upserted.
  const allSlugs = members.map((m) => m.chamberSlug);
  const orgRows =
    allSlugs.length > 0
      ? await db
          .select({ id: organizations.id, slug: organizations.slug })
          .from(organizations)
          .where(inArray(organizations.slug, allSlugs))
      : [];

  const orgSlugToId = new Map(orgRows.map((o) => [o.slug, o.id]));

  // Build all (organizationId, categoryId) pairs from current member data.
  const junctionRows: Array<{ organizationId: string; categoryId: string }> =
    [];
  for (const m of members) {
    const orgId = orgSlugToId.get(m.chamberSlug);
    if (!orgId) continue;
    for (const cat of m.categories) {
      const catId = catSlugToId.get(toSlug(cat.trim()));
      if (catId) junctionRows.push({ organizationId: orgId, categoryId: catId });
    }
  }

  // Replace category junctions for the synced org set ATOMICALLY: the delete and
  // the re-insert must commit together. Without the transaction, a failure between
  // them (timeout, dropped connection, a throwing insert batch) would leave every
  // synced org with ZERO categories — wiping the public directory's facets until
  // the next nightly run. The try/catch records the failure in the sync_log
  // instead of letting a throw escape before the audit row is written.
  if (orgRows.length > 0) {
    const orgIds = orgRows.map((o) => o.id);
    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(organizationCategories)
          .where(inArray(organizationCategories.organizationId, orgIds));
        for (const batch of chunk(junctionRows, 500)) {
          await tx.insert(organizationCategories).values(batch).onConflictDoNothing();
        }
      });
    } catch (err) {
      errors += junctionRows.length;
      errorDetails.push({
        id: "organization_categories",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 4. Write sync_log ─────────────────────────────────────────────────────
  const durationMs = Date.now() - start;

  await db.insert(syncLog).values({
    source: "growthzone",
    added: synced,
    updated: 0,
    removed: 0,
    errors,
    durationMs,
    errorDetails: errorDetails.length > 0 ? errorDetails : null,
  });

  return {
    added: synced,
    updated: 0,
    removed: 0,
    errors,
    durationMs,
    errorDetails,
  };
}

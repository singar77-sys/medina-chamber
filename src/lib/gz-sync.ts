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

import { sql, and, inArray, isNull, notInArray, isNotNull } from "drizzle-orm";
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

/**
 * Fraction of the currently-live directory a scrape must still contain before
 * it is trusted to retire anybody. Mirrors the >10% drop guard in
 * scripts/scrape-members.mjs.
 */
export const RETIREMENT_FLOOR = 0.9;

/**
 * Is this scrape trustworthy enough to soft-delete the members missing from it?
 *
 * Retirement is the one destructive thing gz-sync does, and it runs unattended
 * every night, so it fails CLOSED: an empty or collapsed scrape (GrowthZone
 * outage, markup change, half-fetched letter pages) skips retirement entirely
 * rather than emptying the public directory. Growth is always fine — only a
 * suspicious SHRINK blocks the pass.
 */
export function shouldRetire(scrapedCount: number, liveCount: number): boolean {
  if (scrapedCount === 0) return false;
  if (liveCount === 0) return true; // nothing to lose yet (fresh DB)
  return scrapedCount >= liveCount * RETIREMENT_FLOOR;
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
 *
 * Departed members ARE retired: after the upsert, any GrowthZone-sourced row
 * whose slug is absent from the current scrape is soft-deleted (deleted_at).
 * Without that step the public directory only ever grew — a business that quit
 * the chamber stayed listed as a member forever, and a business that RENAMED
 * itself appeared twice (rename changes both chamberSlug and gzSlug, so
 * neither unique constraint fires and a second active row is inserted). The
 * retirement pass covers both: the stale slug simply stops appearing.
 *
 * Retirement is guarded — see RETIREMENT_FLOOR — so a collapsed or partial
 * scrape can never mass-delete the directory. Only rows with a gz_id are ever
 * touched, so hand-created organizations are never affected.
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
            // description is the ONE column where an empty scrape is ambiguous,
            // so it is COALESCEd instead of overwritten. Unlike every other
            // field in this SET clause it does not come from the directory
            // listing — it comes from a second request, the member's GrowthZone
            // detail page — so a throttled or 5xx'd detail fetch produces a
            // member with a perfectly good name, address and phone and a blank
            // description. scrape-members.mjs already carries yesterday's text
            // forward when that fetch *throws*; this covers the case it cannot
            // see: a 200 whose markup moved, where the parse just returns "".
            // Empty here means "we failed to read it", never "the member
            // deleted it". nullif() is what does the work — the mapping above
            // already turns "" into null, and this keeps the guard honest if
            // that ever changes.
            //
            // Nothing else is COALESCEd, because everywhere else empty is a
            // real value a member can choose: clearing a phone number, dropping
            // a website, deleting a Facebook page, removing a logo, moving to
            // an address with no suite line. Preserving those would make stale
            // data permanently unclearable — the directory would keep serving a
            // disconnected phone number with no way to retract it. The tradeoff
            // here is deliberate and one-sided: a member who genuinely deletes
            // their description keeps the old paragraph until someone edits the
            // row, which is a far smaller failure than blanking the description
            // on 500 listings because one nightly scrape hiccuped.
            description:    sql`coalesce(nullif(excluded.description, ''), ${organizations.description})`,
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

  // ── 3.5 Retire departed members ───────────────────────────────────────────
  // A member that leaves GrowthZone drops out of members.json. Nothing else in
  // the codebase ever writes deleted_at, so without this pass the directory
  // (which filters on status='active' AND deleted_at IS NULL) keeps listing
  // ex-members indefinitely, and the vector index — which DOES delete — drifts
  // out of agreement with it.
  let removed = 0;
  const currentSlugs = members.map((m) => m.chamberSlug);

  // Collapse guard: never retire against a scrape that looks broken. Mirrors
  // the >10% drop guard in scripts/scrape-members.mjs, but measured against
  // what is actually live in the DB so it self-adjusts as the roster changes.
  const [liveRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizations)
    .where(and(isNull(organizations.deletedAt), isNotNull(organizations.gzId)));
  const liveCount = liveRow?.count ?? 0;

  if (!shouldRetire(currentSlugs.length, liveCount)) {
    // Suspicious input — skip retirement entirely and make the skip visible.
    errorDetails.push({
      id: "retire:skipped",
      error: `Scrape has ${currentSlugs.length} members vs ${liveCount} live in DB (below ${RETIREMENT_FLOOR * 100}%); skipped retirement to avoid mass-deleting the directory.`,
    });
  } else {
    try {
      const retired = await db
        .update(organizations)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            isNull(organizations.deletedAt),
            isNotNull(organizations.gzId),
            notInArray(organizations.slug, currentSlugs),
          ),
        )
        .returning({ slug: organizations.slug });

      removed = retired.length;
      if (removed > 0) {
        errorDetails.push({
          id: "retire:removed",
          error: `Soft-deleted ${removed} departed member(s): ${retired.map((r) => r.slug).join(", ")}`,
        });
      }
    } catch (err) {
      errors += 1;
      errorDetails.push({
        id: "retire",
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
    removed,
    errors,
    durationMs,
    errorDetails: errorDetails.length > 0 ? errorDetails : null,
  });

  return {
    added: synced,
    updated: 0,
    removed,
    errors,
    durationMs,
    errorDetails,
  };
}

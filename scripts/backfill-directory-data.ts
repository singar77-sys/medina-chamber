/**
 * backfill-directory-data — enrich organizations with the directory's rich
 * content (description, logoUrl, categories) from the scraped members.json, and
 * align org slugs to the directory's chamberSlug. Prepares the DB to back the
 * member directory (the rich fields live only in members.json; the DB came from
 * a CSV import that lacked them).
 *
 * TARGETED + UPDATE-ONLY by design: touches ONLY description, logo_url, slug, and
 * organization_categories. Leaves gz_id (the real GrowthZone member id), status,
 * membershipTier, and name to the CSV-import / membership systems. Never inserts
 * an organization (the 4 members with no DB org are reported for manual handling).
 *
 * Matching: by slug (chamberSlug == org.slug), else by normalized NAME (the two
 * data sources share no common id; the slug drift is apostrophe/punctuation only).
 * Categories are matched to existing rows by normalized name (avoids duplicates),
 * inserting any genuinely new ones.
 *
 * READ-ONLY by default (dry run). Set BACKFILL_APPLY=1 to write.
 *   DOTENV_CONFIG_PATH=.env.local pnpm tsx scripts/backfill-directory-data.ts
 *   DOTENV_CONFIG_PATH=.env.local BACKFILL_APPLY=1 pnpm tsx scripts/backfill-directory-data.ts
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const APPLY = process.env.BACKFILL_APPLY === "1";

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const toSlug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

interface Member {
  chamberSlug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  categories: string[];
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) return console.log("no DATABASE_URL");
  const sql = postgres(url, { ssl: "require", max: 1 });
  try {
    const members = (
      JSON.parse(readFileSync("src/data/members.json", "utf8")) as { members: Member[] }
    ).members;

    const orgs = await sql<
      { id: string; slug: string; name: string; description: string | null; logo_url: string | null }[]
    >`select id, slug, name, description, logo_url from organizations where deleted_at is null`;
    const cats = await sql<{ id: string; name: string }[]>`select id, name from categories`;

    const orgBySlug = new Map(orgs.map((o) => [o.slug, o]));
    const orgsByName = new Map<string, (typeof orgs)[number][]>();
    for (const o of orgs) (orgsByName.get(normName(o.name)) ?? orgsByName.set(normName(o.name), []).get(normName(o.name))!).push(o);
    const takenSlugs = new Set(orgs.map((o) => o.slug));
    const catIdByName = new Map(cats.map((c) => [normName(c.name), c.id]));

    // ── Match members → orgs ──────────────────────────────────────────────────
    const matched: { m: Member; org: (typeof orgs)[number]; realign: boolean }[] = [];
    const unmatched: { slug: string; name: string; cands: number }[] = [];
    for (const m of members) {
      const direct = orgBySlug.get(m.chamberSlug);
      if (direct) {
        matched.push({ m, org: direct, realign: false });
        continue;
      }
      const cands = (orgsByName.get(normName(m.name)) ?? []).filter((o) => o.slug !== m.chamberSlug);
      if (cands.length === 1 && !takenSlugs.has(m.chamberSlug)) {
        matched.push({ m, org: cands[0], realign: true });
      } else {
        unmatched.push({ slug: m.chamberSlug, name: m.name, cands: cands.length });
      }
    }

    // ── Plan ──────────────────────────────────────────────────────────────────
    const newCatNames = new Set<string>();
    let descSet = 0, logoSet = 0, realigns = 0, links = 0;
    for (const { m, org, realign } of matched) {
      if (m.description?.trim() && m.description.trim() !== org.description) descSet++;
      if (m.logoUrl?.trim() && m.logoUrl.trim() !== org.logo_url) logoSet++;
      if (realign) realigns++;
      for (const c of m.categories) {
        const t = c.trim();
        if (!t) continue;
        links++;
        if (!catIdByName.has(normName(t))) newCatNames.add(t);
      }
    }

    console.log(`\nMATCHED=${matched.length} (bySlug=${matched.filter((x) => !x.realign).length} byName=${realigns})  UNMATCHED=${unmatched.length}`);
    console.log(`PLAN: setDescriptions=${descSet} setLogos=${logoSet} slugRealigns=${realigns} categoryLinks=${links} newCategories=${newCatNames.size}`);
    if (unmatched.length) console.log("UNMATCHED (manual):", unmatched.map((u) => `${u.slug}["${u.name}" cands:${u.cands}]`).join(" ; "));

    if (!APPLY) {
      console.log("\nDRY RUN — no writes. Set BACKFILL_APPLY=1 to apply.");
      return;
    }

    // ── Apply (one transaction — all-or-nothing, so a mid-run failure can't
    //    leave orgs with their category links deleted but not rebuilt) ───────────
    let updated = 0;
    let junctionCount = 0;
    await sql.begin(async (tx) => {
      // 1. Insert genuinely-new categories.
      if (newCatNames.size) {
        const rows = [...newCatNames].map((name) => ({ name, slug: toSlug(name), sort_order: 0 }));
        for (const b of chunk(rows, 200)) {
          await tx`insert into categories ${tx(b, "name", "slug", "sort_order")} on conflict (slug) do nothing`;
        }
      }
      const cats2 = await tx<{ id: string; name: string }[]>`select id, name from categories`;
      const catId = new Map(cats2.map((c) => [normName(c.name), c.id]));

      // 2. Per-org content updates (coalesce so an empty member value never nulls an existing one).
      for (const { m, org, realign } of matched) {
        const d = m.description?.trim() || null;
        const l = m.logoUrl?.trim() || null;
        const newSlug = realign ? m.chamberSlug : org.slug;
        await tx`update organizations set
            description = coalesce(${d}, description),
            logo_url = coalesce(${l}, logo_url),
            slug = ${newSlug},
            updated_at = now()
          where id = ${org.id}`;
        updated++;
      }

      // 3. Rebuild organization_categories for the matched orgs only.
      const ids = matched.map((x) => x.org.id);
      for (const b of chunk(ids, 500)) {
        await tx`delete from organization_categories where organization_id in ${tx(b)}`;
      }
      const junction: { organization_id: string; category_id: string }[] = [];
      for (const { m, org } of matched) {
        for (const c of m.categories) {
          const id = catId.get(normName(c.trim()));
          if (c.trim() && id) junction.push({ organization_id: org.id, category_id: id });
        }
      }
      for (const b of chunk(junction, 500)) {
        await tx`insert into organization_categories ${tx(b, "organization_id", "category_id")} on conflict do nothing`;
      }
      junctionCount = junction.length;
    });

    const [v] = await sql<{ d: number; l: number; c: number }[]>`
      select count(description)::int d, count(logo_url)::int l,
        (select count(distinct organization_id)::int from organization_categories oc
           join organizations o on o.id = oc.organization_id
           where o.status='active' and o.deleted_at is null) c
      from organizations where status='active' and deleted_at is null`;
    console.log(`\nAPPLIED: orgsUpdated=${updated} categoryLinks=${junctionCount} newCategories=${newCatNames.size}`);
    console.log(`VERIFY active orgs: withDescription=${v.d} withLogo=${v.l} withCategory=${v.c}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => console.log("FAILED:", e?.code ?? e?.message ?? "error"));

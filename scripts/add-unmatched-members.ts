/**
 * add-unmatched-members — reconciles the members.json businesses that the
 * update-only backfill (backfill-directory-data.ts) reported as UNMATCHED.
 *
 * Investigation (dry-run + fuzzy pre-check) found two cases:
 *   • TRULY ABSENT  → INSERT a new org.
 *       edward-jones-investments-lauri-mackey-financial-advisor, gentle-endodontics
 *   • SAME BUSINESS under a stale CSV-import slug → REALIGN the existing active org
 *     (its name normalized too differently for the backfill to auto-match):
 *       paragram-web-design-development  ⇐  org "paragram"        (same site paragram.co)
 *       buckeye-pva                      ⇐  org "paralyzed-veterans-of-america-buckeye-chapter"
 *                                            (identical site buckeyepva.org + 2775 Bishop Rd)
 *
 * Realigning the slug is REQUIRED: gz-sync upserts by slug, so leaving the stale
 * slug would make tonight's now-working sync INSERT a duplicate. After realign,
 * slug == chamberSlug, so the sync is a clean update.
 *
 * Field semantics mirror gz-sync (gz_id = gzSlug, status='active', parseAddress,
 * memberTier) so tonight's sync is a no-op. COALESCE protects existing data: a
 * blank value in members.json never nulls a populated DB column (e.g. paragram's
 * real CSV address in Wadsworth survives members.json's empty address).
 *
 * SAFE BY DESIGN: dry-run default. Set ADD_MEMBERS_APPLY=1 to write. One transaction.
 *   DOTENV_CONFIG_PATH=.env.local pnpm tsx scripts/add-unmatched-members.ts
 *   DOTENV_CONFIG_PATH=.env.local ADD_MEMBERS_APPLY=1 pnpm tsx scripts/add-unmatched-members.ts
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import {
  COMMUNITY_INVESTOR_SLUGS,
  VISIBILITY_PLUS_SLUGS,
} from "../src/data/tier-overrides";

const APPLY = process.env.ADD_MEMBERS_APPLY === "1";

const TARGET_SLUGS = [
  "buckeye-pva",
  "edward-jones-investments-lauri-mackey-financial-advisor",
  "gentle-endodontics",
  "paragram-web-design-development",
];

// members.json chamberSlug → existing CSV-import org slug confirmed (via website /
// address) to be the SAME business. These get realigned, not inserted.
const REALIGN_FROM: Record<string, string> = {
  "paragram-web-design-development": "paragram",
  "buckeye-pva": "paralyzed-veterans-of-america-buckeye-chapter",
};

interface Member {
  name: string;
  chamberSlug: string;
  gzSlug: string;
  address: string;
  phone: string;
  website: string;
  logoUrl: string;
  description: string;
  categories: string[];
}

// helpers copied verbatim from gz-sync.ts so output is byte-identical
const toSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const memberTier = (slug: string): string =>
  COMMUNITY_INVESTOR_SLUGS.has(slug) ? "community_investor" : VISIBILITY_PLUS_SLUGS.has(slug) ? "visibility_plus" : "standard";

function parseAddress(raw: string): { address1: string | null; city: string; state: string; zip: string | null } {
  if (!raw) return { address1: null, city: "Medina", state: "OH", zip: null };
  const [street = "", city = "Medina", state = "OH", zip = ""] = raw.split(",").map((s) => s.trim());
  return { address1: street || null, city: city || "Medina", state: state || "OH", zip: zip || null };
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) return console.log("no DATABASE_URL");
  const sql = postgres(url, { ssl: "require", max: 1 });
  try {
    const all = (JSON.parse(readFileSync("src/data/members.json", "utf8")) as { members: Member[] }).members;
    const targets = TARGET_SLUGS.map((s) => {
      const m = all.find((x) => x.chamberSlug === s);
      if (!m) throw new Error(`members.json missing slug: ${s}`);
      return m;
    });

    // Existing rows that could collide or be realign sources.
    const lookSlugs = [...TARGET_SLUGS, ...Object.values(REALIGN_FROM)];
    const lookGz = targets.map((m) => m.gzSlug);
    const existing = await sql<{ id: string; slug: string; gz_id: string | null; name: string; status: string }[]>`
      select id, slug, gz_id, name, status from organizations
        where slug in ${sql(lookSlugs)} or gz_id in ${sql(lookGz)}`;
    const bySlug = new Map(existing.map((r) => [r.slug, r]));

    // Decide an action per target.
    type Plan = { m: Member; action: "insert" | "realign" | "skip"; fromId?: string; fromSlug?: string };
    const plan: Plan[] = targets.map((m) => {
      if (bySlug.has(m.chamberSlug)) return { m, action: "skip" }; // already canonical
      const fromSlug = REALIGN_FROM[m.chamberSlug];
      const from = fromSlug ? bySlug.get(fromSlug) : undefined;
      if (from) return { m, action: "realign", fromId: from.id, fromSlug };
      return { m, action: "insert" };
    });

    // Category plan (only for orgs we will write).
    const cats = await sql<{ id: string; slug: string }[]>`select id, slug from categories`;
    const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
    const newCats = new Set<string>();
    for (const p of plan) if (p.action !== "skip") for (const c of p.m.categories) {
      const t = c.trim();
      if (t && !catBySlug.has(toSlug(t))) newCats.add(t);
    }

    console.log(`\nPLAN  (newCategories=${newCats.size}${newCats.size ? ": " + [...newCats].join(", ") : ""})`);
    for (const p of plan) {
      const a = parseAddress(p.m.address);
      const addr = [a.address1, a.city, a.state, a.zip].filter(Boolean).join(", ");
      console.log(`  ${p.action.toUpperCase().padEnd(8)} ${p.m.chamberSlug}` +
        (p.action === "realign" ? `  ⇐ "${p.fromSlug}"` : "") +
        `  tier=${memberTier(p.m.chamberSlug)}  cats=[${p.m.categories.join(", ")}]` +
        (p.m.address ? `  addr=[${addr}]` : `  addr=[<blank→keep existing>]`));
    }

    if (!APPLY) return console.log("\nDRY RUN — no writes. Set ADD_MEMBERS_APPLY=1 to apply.");

    const writes = plan.filter((p) => p.action !== "skip");
    if (!writes.length) return console.log("\nNothing to do.");

    await sql.begin(async (tx) => {
      // 1. new categories
      for (const name of newCats) {
        await tx`insert into categories (name, slug, sort_order) values (${name}, ${toSlug(name)}, 0) on conflict (slug) do nothing`;
      }
      const cats2 = await tx<{ id: string; slug: string }[]>`select id, slug from categories`;
      const catId = new Map(cats2.map((c) => [c.slug, c.id]));

      // 2. inserts + realigns
      for (const p of writes) {
        const m = p.m;
        const a = parseAddress(m.address);
        const hasAddr = !!m.address.trim();
        const tier = memberTier(m.chamberSlug);
        if (p.action === "insert") {
          await tx`insert into organizations
              (gz_id, name, slug, status, phone, website_url, address1, city, state, zip, description, logo_url, membership_tier)
            values
              (${m.gzSlug || null}, ${m.name}, ${m.chamberSlug}, ${"active"}::organization_status,
               ${m.phone || null}, ${m.website || null}, ${a.address1}, ${a.city}, ${a.state}, ${a.zip},
               ${m.description || null}, ${m.logoUrl || null}, ${tier})
            on conflict (slug) do nothing`;
        } else {
          // realign: canonical fields set directly; blank-able fields coalesced so
          // members.json's gaps never erase populated CSV data.
          await tx`update organizations set
              slug = ${m.chamberSlug},
              name = ${m.name},
              gz_id = ${m.gzSlug || null},
              status = ${"active"}::organization_status,
              phone = coalesce(${m.phone || null}, phone),
              website_url = coalesce(${m.website || null}, website_url),
              address1 = coalesce(${hasAddr ? a.address1 : null}, address1),
              city = coalesce(${hasAddr ? a.city : null}, city),
              state = coalesce(${hasAddr ? a.state : null}, state),
              zip = coalesce(${hasAddr ? a.zip : null}, zip),
              description = coalesce(${m.description || null}, description),
              logo_url = coalesce(${m.logoUrl || null}, logo_url),
              membership_tier = ${tier},
              updated_at = now()
            where id = ${p.fromId}`;
        }
      }

      // 3. rebuild category junctions for every written org (by final slug)
      const finalSlugs = writes.map((p) => p.m.chamberSlug);
      const orgRows = await tx<{ id: string; slug: string }[]>`select id, slug from organizations where slug in ${tx(finalSlugs)}`;
      const orgId = new Map(orgRows.map((o) => [o.slug, o.id]));
      const ids = [...orgId.values()];
      if (ids.length) await tx`delete from organization_categories where organization_id in ${tx(ids)}`;

      let links = 0;
      for (const p of writes) {
        const oid = orgId.get(p.m.chamberSlug);
        if (!oid) continue;
        for (const c of p.m.categories) {
          const cid = catId.get(toSlug(c.trim()));
          if (c.trim() && cid) {
            await tx`insert into organization_categories (organization_id, category_id) values (${oid}, ${cid}) on conflict do nothing`;
            links++;
          }
        }
      }
      console.log(`\nAPPLIED: inserts=${writes.filter((p) => p.action === "insert").length} realigns=${writes.filter((p) => p.action === "realign").length} categoryLinks=${links} newCategories=${newCats.size}`);
    });

    // verify
    const verify = await sql<{ slug: string; name: string; status: string; tier: string | null; cats: string | null }[]>`
      select o.slug, o.name, o.status, o.membership_tier as tier,
             string_agg(c.name, ', ' order by c.name) as cats
        from organizations o
        left join organization_categories oc on oc.organization_id = o.id
        left join categories c on c.id = oc.category_id
       where o.slug in ${sql(TARGET_SLUGS)}
       group by o.slug, o.name, o.status, o.membership_tier
       order by o.slug`;
    console.log(`\nVERIFY (${verify.length}/4):`);
    for (const v of verify) console.log(`  ${v.slug}  "${v.name}"  status=${v.status} tier=${v.tier}  cats=[${v.cats ?? ""}]`);

    // make sure the old realign-source slugs are gone (no leftover duplicate)
    const orphans = await sql<{ slug: string }[]>`select slug from organizations where slug in ${sql(Object.values(REALIGN_FROM))}`;
    console.log(`LEFTOVER old slugs (should be 0): ${orphans.length ? orphans.map((o) => o.slug).join(", ") : "none"}`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => console.log("FAILED:", e?.message ?? e));

/**
 * DB-backed member directory — returns the same `Member` shape the existing
 * directory UI (DirectoryClient, MemberCard, the [slug] page) already consumes,
 * so the render switch off static members.json touches the data source only.
 *
 * Only status='active' (non-deleted) orgs are public — this is the line that
 * keeps the CSV-imported non_member / inactive / prospect orgs OUT of the
 * directory. slug == chamberSlug (aligned by the backfill), so indexed URLs and
 * the /api/search vector index (keyed by slug) keep working.
 */

import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { organizations, organizationCategories, categories } from "@/lib/db/schema";
import type { Member } from "@/data/members";

// DB tier text → the legacy numeric rank the UI sorts by (premium first).
// community_investor is the TOP tier and must sort first — omitting it made
// every CI default to 20 (silver) and sink below Visibility Plus, dropping the
// Community-Investor-first ordering the directory grid is built around.
const TIER_NUM: Record<string, number> = { community_investor: 1, visibility_plus: 2, gold: 10, silver: 20 };

const ORG_COLS = {
  id: organizations.id,
  name: organizations.name,
  slug: organizations.slug,
  phone: organizations.phone,
  websiteUrl: organizations.websiteUrl,
  address1: organizations.address1,
  city: organizations.city,
  state: organizations.state,
  zip: organizations.zip,
  facebook: organizations.facebook,
  twitter: organizations.twitter,
  instagram: organizations.instagram,
  linkedin: organizations.linkedin,
  youtube: organizations.youtube,
  description: organizations.description,
  logoUrl: organizations.logoUrl,
  membershipTier: organizations.membershipTier,
} as const;

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  websiteUrl: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
  description: string | null;
  logoUrl: string | null;
  membershipTier: string | null;
};

function toMember(o: OrgRow, cats: string[]): Member {
  return {
    name: o.name,
    chamberSlug: o.slug,
    gzSlug: "",
    gzUrl: "",
    address: [o.address1, o.city, o.state, o.zip].filter(Boolean).join(", "),
    phone: o.phone ?? "",
    website: o.websiteUrl ?? "",
    logoUrl: o.logoUrl ?? "",
    description: o.description ?? "",
    categories: cats,
    social: {
      facebook: o.facebook ?? undefined,
      linkedin: o.linkedin ?? undefined,
      instagram: o.instagram ?? undefined,
      twitter: o.twitter ?? undefined,
      youtube: o.youtube ?? undefined,
    },
    membershipTier: TIER_NUM[o.membershipTier ?? ""] ?? 20,
  };
}

/** All public (active) members, name-sorted. */
export async function getDirectoryMembers(db: DB): Promise<Member[]> {
  const orgs = (await db
    .select(ORG_COLS)
    .from(organizations)
    .where(and(eq(organizations.status, "active"), isNull(organizations.deletedAt)))) as OrgRow[];

  const ids = orgs.map((o) => o.id);
  const links = ids.length
    ? await db
        .select({ orgId: organizationCategories.organizationId, name: categories.name })
        .from(organizationCategories)
        .innerJoin(categories, eq(organizationCategories.categoryId, categories.id))
        .where(inArray(organizationCategories.organizationId, ids))
    : [];

  const catsByOrg = new Map<string, string[]>();
  for (const l of links) {
    const arr = catsByOrg.get(l.orgId) ?? catsByOrg.set(l.orgId, []).get(l.orgId)!;
    arr.push(l.name);
  }

  return orgs
    .map((o) => toMember(o, (catsByOrg.get(o.id) ?? []).sort((a, b) => a.localeCompare(b))))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One public member by slug, plus its org id (for the directory_view signal). */
export async function getDirectoryMemberBySlug(
  db: DB,
  slug: string,
): Promise<{ member: Member; id: string } | null> {
  const [o] = (await db
    .select(ORG_COLS)
    .from(organizations)
    .where(
      and(
        eq(organizations.slug, slug),
        eq(organizations.status, "active"),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1)) as OrgRow[];
  if (!o) return null;

  const links = await db
    .select({ name: categories.name })
    .from(organizationCategories)
    .innerJoin(categories, eq(organizationCategories.categoryId, categories.id))
    .where(eq(organizationCategories.organizationId, o.id));

  return { member: toMember(o, links.map((l) => l.name).sort((a, b) => a.localeCompare(b))), id: o.id };
}

/** Categories by member-count, descending — the directory's industry facets. */
export function topIndustries(
  members: Member[],
  limit?: number,
): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  for (const m of members) for (const c of m.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  const sorted = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
  return limit && limit > 0 ? sorted.slice(0, limit) : sorted;
}

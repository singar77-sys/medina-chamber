/**
 * Committees data layer — public listing, a member's involvement, idempotent
 * join/leave, and the admin roster. Replaces GrowthZone's committee module.
 *
 * Membership model: ONE committee_members row per (committee, org), toggled via
 * leftAt (null = active). Join reactivates a left row or inserts; leave stamps
 * leftAt. Join/leave take `db` as a parameter so they're unit-testable.
 */

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { committees, committeeMembers, organizations, contacts } from "@/lib/db/schema";

/** kebab-case a committee name into a slug; never empty. */
export function committeeSlug(name: string): string {
  const k = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return k || "committee";
}

/** Unique committees.slug from a name (-2, -3, … on collision). */
export async function generateCommitteeSlug(db: DB, name: string): Promise<string> {
  const base = committeeSlug(name);
  let slug = base;
  let n = 1;
  while (n < 100) {
    const [hit] = await db
      .select({ id: committees.id })
      .from(committees)
      .where(eq(committees.slug, slug))
      .limit(1);
    if (!hit) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export interface PublicCommittee {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  meetingSchedule: string | null;
  memberCount: number;
}

/** Public + active committees with their active-member counts, A→Z. */
export async function getPublicCommittees(db: DB): Promise<PublicCommittee[]> {
  return db
    .select({
      id: committees.id,
      name: committees.name,
      slug: committees.slug,
      description: committees.description,
      meetingSchedule: committees.meetingSchedule,
      memberCount: sql<number>`coalesce(count(${committeeMembers.id}) filter (where ${committeeMembers.leftAt} is null), 0)::int`,
    })
    .from(committees)
    .leftJoin(committeeMembers, eq(committeeMembers.committeeId, committees.id))
    .where(and(eq(committees.isPublic, true), eq(committees.isActive, true)))
    .groupBy(committees.id)
    .orderBy(asc(committees.name));
}

/** The committee ids an org is currently (actively) on. */
export async function getMemberCommitteeIds(db: DB, organizationId: string): Promise<string[]> {
  const rows = await db
    .select({ committeeId: committeeMembers.committeeId })
    .from(committeeMembers)
    .where(and(eq(committeeMembers.organizationId, organizationId), isNull(committeeMembers.leftAt)));
  return rows.map((r) => r.committeeId);
}

/**
 * Join: ensure an active membership for (committee, org). Returns true iff THIS
 * call added one (already-active → false, idempotent). Reactivates a prior
 * left row rather than stacking duplicates.
 */
export async function joinCommittee(
  db: DB,
  committeeId: string,
  organizationId: string,
  contactId: string | null,
): Promise<boolean> {
  const [active] = await db
    .select({ id: committeeMembers.id })
    .from(committeeMembers)
    .where(
      and(
        eq(committeeMembers.committeeId, committeeId),
        eq(committeeMembers.organizationId, organizationId),
        isNull(committeeMembers.leftAt),
      ),
    )
    .limit(1);
  if (active) return false; // already a member

  const [prior] = await db
    .select({ id: committeeMembers.id })
    .from(committeeMembers)
    .where(
      and(
        eq(committeeMembers.committeeId, committeeId),
        eq(committeeMembers.organizationId, organizationId),
      ),
    )
    .limit(1);

  if (prior) {
    await db
      .update(committeeMembers)
      .set({ leftAt: null, joinedAt: new Date(), contactId })
      .where(eq(committeeMembers.id, prior.id));
    return true;
  }

  await db
    .insert(committeeMembers)
    .values({ committeeId, organizationId, contactId, role: "member" });
  return true;
}

/** Leave: stamp leftAt on the active row(s). Returns true iff one was active. */
export async function leaveCommittee(
  db: DB,
  committeeId: string,
  organizationId: string,
): Promise<boolean> {
  const rows = await db
    .update(committeeMembers)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(committeeMembers.committeeId, committeeId),
        eq(committeeMembers.organizationId, organizationId),
        isNull(committeeMembers.leftAt),
      ),
    )
    .returning({ id: committeeMembers.id });
  return rows.length > 0;
}

export interface RosterEntry {
  memberId: string;
  role: string;
  joinedAt: Date;
  organizationId: string;
  orgName: string;
  contactName: string | null;
  contactEmail: string | null;
}

/** Active roster of a committee for the admin view. */
export async function getCommitteeRoster(db: DB, committeeId: string): Promise<RosterEntry[]> {
  const rows = await db
    .select({
      memberId: committeeMembers.id,
      role: committeeMembers.role,
      joinedAt: committeeMembers.joinedAt,
      organizationId: organizations.id,
      orgName: organizations.name,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      contactEmail: contacts.email,
    })
    .from(committeeMembers)
    .innerJoin(organizations, eq(committeeMembers.organizationId, organizations.id))
    .leftJoin(contacts, eq(committeeMembers.contactId, contacts.id))
    .where(and(eq(committeeMembers.committeeId, committeeId), isNull(committeeMembers.leftAt)))
    .orderBy(asc(organizations.name));

  return rows.map((r) => ({
    memberId: r.memberId,
    role: r.role,
    joinedAt: r.joinedAt,
    organizationId: r.organizationId,
    orgName: r.orgName,
    contactName: r.firstName || r.lastName ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() : null,
    contactEmail: r.contactEmail,
  }));
}

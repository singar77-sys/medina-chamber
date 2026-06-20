/**
 * resolveAudience — turn a campaign's CampaignSegment filter into the concrete
 * list of recipients at send time.
 *
 * Hard rules (never overridable by a segment): a recipient must have an email,
 * must NOT be unsubscribed (contacts.unsubscribedAt), and must not be a repeat
 * hard-bouncer. Beyond that the segment narrows by organization status (default
 * "active"), explicit organization ids, and membership tier.
 *
 * categories + excludeInactiveDays from CampaignSegment are not yet wired (the
 * composer offers status + tier first); add them here when the UI does.
 */

import { and, eq, inArray, isNull, lt, isNotNull } from "drizzle-orm";
import type { DB } from "@/lib/db";
import type { CampaignSegment } from "@/lib/db/schema";
import { contacts, organizations, organizationStatus, memberships, membershipTiers } from "@/lib/db/schema";

/** A repeat hard-bounce is suppressed regardless of segment. */
const MAX_BOUNCES = 3;

export interface AudienceMember {
  contactId: string;
  email: string;
  organizationId: string;
  firstName: string;
}

export async function resolveAudience(
  db: DB,
  segment: CampaignSegment,
): Promise<AudienceMember[]> {
  const statuses = (segment.statuses?.length ? segment.statuses : ["active"]) as
    (typeof organizationStatus.enumValues)[number][];

  const conditions = [
    isNotNull(contacts.email),
    isNull(contacts.unsubscribedAt),
    // suppress repeat hard-bouncers (bounceCount is NOT NULL, default 0)
    lt(contacts.bounceCount, MAX_BOUNCES),
    inArray(organizations.status, statuses),
  ];

  if (segment.organizationIds?.length) {
    conditions.push(inArray(organizations.id, segment.organizationIds));
  }

  if (segment.tiers?.length) {
    // Orgs with an ACTIVE membership in one of the requested tiers.
    const tierOrgs = db
      .select({ id: memberships.organizationId })
      .from(memberships)
      .innerJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
      .where(and(eq(memberships.status, "active"), inArray(membershipTiers.slug, segment.tiers)));
    conditions.push(inArray(organizations.id, tierOrgs));
  }

  const rows = await db
    .selectDistinct({
      contactId: contacts.id,
      email: contacts.email,
      organizationId: organizations.id,
      firstName: contacts.firstName,
    })
    .from(contacts)
    .innerJoin(organizations, eq(contacts.organizationId, organizations.id))
    .where(and(...conditions));

  return rows
    .filter((r): r is typeof r & { email: string } => r.email != null)
    .map((r) => ({
      contactId: r.contactId,
      email: r.email,
      organizationId: r.organizationId,
      firstName: r.firstName,
    }));
}

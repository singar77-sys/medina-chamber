/**
 * Aggregations over engagement_events for the reporting dashboards.
 *
 * Two consumers:
 *   - admin overview (chamber-wide: totals, by-type, most-engaged members)
 *   - member ROI (one org: "what the chamber did for you")
 *
 * The queries return raw grouped counts; the pure build* helpers shape them for
 * display (and are unit-tested). Counts come back as bigint → coerce with Number.
 */

import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { engagementEvents, organizations } from "@/lib/db/schema";

export const EVENT_TYPE_LABELS: Record<string, string> = {
  directory_view: "Directory views",
  referral_click: "Website click-throughs",
  hot_deal_view: "Deal click-throughs",
  chamberbot_mention: "ChamberBot mentions",
  event_attended: "Events attended",
  event_registered: "Event registrations",
  email_opened: "Emails opened",
  email_clicked: "Email link clicks",
  portal_login: "Portal logins",
  profile_updated: "Profile updates",
  renewal_completed: "Renewals",
  payment_failed: "Failed payments",
  membership_lapsed: "Memberships lapsed",
};

export interface TypeCount {
  eventType: string;
  n: number;
}

function sinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// ── Admin: chamber-wide overview ────────────────────────────────────────────────

export async function getEngagementOverview(db: DB, sinceDays = 30) {
  const since = sinceDate(sinceDays);

  const byType = await db
    .select({ eventType: engagementEvents.eventType, n: count() })
    .from(engagementEvents)
    .where(gte(engagementEvents.occurredAt, since))
    .groupBy(engagementEvents.eventType);

  const topOrgs = await db
    .select({
      orgId: engagementEvents.organizationId,
      orgName: organizations.name,
      n: count(),
    })
    .from(engagementEvents)
    .innerJoin(organizations, eq(engagementEvents.organizationId, organizations.id))
    .where(gte(engagementEvents.occurredAt, since))
    .groupBy(engagementEvents.organizationId, organizations.name)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(10);

  // Accurate distinct-org count (the top-10 list would saturate the headline stat).
  // count(distinct …) already ignores NULL org ids (anonymous events).
  const [distinct] = await db
    .select({ n: sql<number>`count(distinct ${engagementEvents.organizationId})` })
    .from(engagementEvents)
    .where(gte(engagementEvents.occurredAt, since));

  const total = byType.reduce((sum, r) => sum + Number(r.n), 0);
  return {
    total,
    distinctOrgs: Number(distinct?.n ?? 0),
    byType: byType.map((r) => ({ eventType: r.eventType, n: Number(r.n) })) as TypeCount[],
    topOrgs: topOrgs.map((r) => ({ orgId: r.orgId, orgName: r.orgName, n: Number(r.n) })),
  };
}

// ── Member: one org's engagement ────────────────────────────────────────────────

export async function getMemberEngagement(db: DB, organizationId: string, sinceDays = 90) {
  const since = sinceDate(sinceDays);

  const byType = await db
    .select({ eventType: engagementEvents.eventType, n: count() })
    .from(engagementEvents)
    .where(
      and(
        eq(engagementEvents.organizationId, organizationId),
        gte(engagementEvents.occurredAt, since),
      ),
    )
    .groupBy(engagementEvents.eventType);

  const total = byType.reduce((sum, r) => sum + Number(r.n), 0);
  return { total, byType: byType.map((r) => ({ eventType: r.eventType, n: Number(r.n) })) as TypeCount[] };
}

// ── Pure display shapers (unit-tested) ──────────────────────────────────────────

export interface Bar {
  type: string;
  label: string;
  count: number;
}

/** All event types present, newest-friendly labels, sorted by count desc. */
export function buildTypeBars(byType: TypeCount[]): Bar[] {
  return byType
    .map((r) => ({ type: r.eventType, label: EVENT_TYPE_LABELS[r.eventType] ?? r.eventType, count: Number(r.n) }))
    .sort((a, b) => b.count - a.count);
}

// The member-facing "ROI" metrics, in display order — the value/visibility signals
// we actually track today. (directory_view + referral_click are deferred until the
// directory is DB-backed, so they're surfaced as a "coming soon" note, not a 0 card.)
export const MEMBER_ROI_TYPES = [
  "hot_deal_view",
  "event_attended",
  "event_registered",
  "renewal_completed",
] as const;

/** Fixed set of member ROI cards, filling 0 for any type with no events yet. */
export function buildMemberRoiCards(byType: TypeCount[]): Bar[] {
  const counts = new Map(byType.map((r) => [r.eventType, Number(r.n)]));
  return MEMBER_ROI_TYPES.map((t) => ({ type: t, label: EVENT_TYPE_LABELS[t], count: counts.get(t) ?? 0 }));
}

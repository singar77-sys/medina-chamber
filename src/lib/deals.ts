/**
 * Hot deals data layer — the public deals feed, a member's own deals, and the
 * admin moderation list. Member-submitted deals go public only when isActive +
 * isApproved + inside their date window; staff-entered deals are auto-approved.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { hotDeals, organizations } from "@/lib/db/schema";

export interface PublicDeal {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  discountLabel: string | null;
  redemptionInstructions: string | null;
  dealUrl: string | null;
  endsAt: string | null;
  orgName: string;
  orgSlug: string;
  orgLogoUrl: string | null;
  orgWebsite: string | null;
}

/** Live deals for the public page: active + approved + inside the date window, newest first. */
export async function getPublicDeals(db: DB): Promise<PublicDeal[]> {
  return db
    .select({
      id: hotDeals.id,
      title: hotDeals.title,
      description: hotDeals.description,
      terms: hotDeals.terms,
      discountLabel: hotDeals.discountLabel,
      redemptionInstructions: hotDeals.redemptionInstructions,
      dealUrl: hotDeals.dealUrl,
      endsAt: hotDeals.endsAt,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      orgLogoUrl: organizations.logoUrl,
      orgWebsite: organizations.websiteUrl,
    })
    .from(hotDeals)
    .innerJoin(organizations, eq(hotDeals.organizationId, organizations.id))
    .where(
      and(
        eq(hotDeals.isActive, true),
        eq(hotDeals.isApproved, true),
        sql`(${hotDeals.startsAt} is null or ${hotDeals.startsAt} <= current_date)`,
        sql`(${hotDeals.endsAt} is null or ${hotDeals.endsAt} >= current_date)`,
      ),
    )
    .orderBy(desc(hotDeals.createdAt));
}

export interface MemberDeal {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  discountLabel: string | null;
  redemptionInstructions: string | null;
  dealUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
}

/** All of an org's deals (any status), newest first — for the member portal. */
export async function getMemberDeals(db: DB, organizationId: string): Promise<MemberDeal[]> {
  return db
    .select({
      id: hotDeals.id,
      title: hotDeals.title,
      description: hotDeals.description,
      terms: hotDeals.terms,
      discountLabel: hotDeals.discountLabel,
      redemptionInstructions: hotDeals.redemptionInstructions,
      dealUrl: hotDeals.dealUrl,
      startsAt: hotDeals.startsAt,
      endsAt: hotDeals.endsAt,
      isActive: hotDeals.isActive,
      isApproved: hotDeals.isApproved,
      createdAt: hotDeals.createdAt,
    })
    .from(hotDeals)
    .where(eq(hotDeals.organizationId, organizationId))
    .orderBy(desc(hotDeals.createdAt));
}

export interface AdminDeal extends MemberDeal {
  organizationId: string;
  orgName: string;
}

/** All deals for the admin moderation view — pending (unapproved) first, then newest. */
export async function getAdminDeals(db: DB): Promise<AdminDeal[]> {
  return db
    .select({
      id: hotDeals.id,
      title: hotDeals.title,
      description: hotDeals.description,
      terms: hotDeals.terms,
      discountLabel: hotDeals.discountLabel,
      redemptionInstructions: hotDeals.redemptionInstructions,
      dealUrl: hotDeals.dealUrl,
      startsAt: hotDeals.startsAt,
      endsAt: hotDeals.endsAt,
      isActive: hotDeals.isActive,
      isApproved: hotDeals.isApproved,
      createdAt: hotDeals.createdAt,
      organizationId: hotDeals.organizationId,
      orgName: organizations.name,
    })
    .from(hotDeals)
    .innerJoin(organizations, eq(hotDeals.organizationId, organizations.id))
    .orderBy(asc(hotDeals.isApproved), desc(hotDeals.createdAt));
}

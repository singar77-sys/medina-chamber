/**
 * GET /go/deal/[id] — tracked click-through for a member hot deal.
 *
 * Logs a hot_deal_view engagement event (member-ROI dashboard), then 302s to the
 * deal's destination. The destination is looked up server-side from the DB
 * (the deal's dealUrl, else the org's website) — never taken from the query — so
 * this is not an open redirect; it's also re-validated to http(s) before use.
 * Unknown id / no usable destination falls back to /deals.
 */

import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { hotDeals, organizations } from "@/lib/db/schema";
import { logEngagement } from "@/lib/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeHttpUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const origin = new URL(req.url).origin;
  const fallback = NextResponse.redirect(`${origin}/deals`, 302);

  if (!UUID_RE.test(id)) return fallback;

  // Only a live deal is clickable/trackable — mirror getPublicDeals (active +
  // approved + inside its date window, on a real org). Otherwise an unapproved
  // deal's UUID (visible in the member portal) would 302 + log a hot_deal_view
  // before staff moderate it, and expired/paused deals would still drive metrics.
  const [deal] = await db
    .select({
      organizationId: hotDeals.organizationId,
      dealUrl: hotDeals.dealUrl,
      orgWebsite: organizations.websiteUrl,
    })
    .from(hotDeals)
    .innerJoin(organizations, eq(hotDeals.organizationId, organizations.id))
    .where(
      and(
        eq(hotDeals.id, id),
        eq(hotDeals.isActive, true),
        eq(hotDeals.isApproved, true),
        sql`(${hotDeals.startsAt} is null or ${hotDeals.startsAt} <= current_date)`,
        sql`(${hotDeals.endsAt} is null or ${hotDeals.endsAt} >= current_date)`,
      ),
    )
    .limit(1);

  const dest = deal ? safeHttpUrl(deal.dealUrl) ?? safeHttpUrl(deal.orgWebsite) : null;
  if (!deal || !dest) return fallback;

  await logEngagement(db, {
    eventType: "hot_deal_view",
    organizationId: deal.organizationId,
    metadata: { dealId: id, destination: dest },
  });

  return NextResponse.redirect(dest, 302);
}

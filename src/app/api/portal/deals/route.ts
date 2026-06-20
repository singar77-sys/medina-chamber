/**
 * POST /api/portal/deals — a member submits a hot deal for their own org.
 *
 * Identity (organizationId) comes ONLY from the portal_session cookie, never the
 * body. New member submissions are isApproved=false and go public only after
 * staff moderation. Rate-limited.
 */

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hotDeals } from "@/lib/db/schema";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { limitPortalProfile } from "@/lib/rate-limit";
import { buildDealValues } from "@/lib/deals-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSession() {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export async function POST(req: Request): Promise<Response> {
  const limited = await limitPortalProfile(req);
  if (limited) return limited;

  const session = await getSession();
  if (!session) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = buildDealValues(body, { requireCore: true });
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const v = parsed.values;

  const [deal] = await db
    .insert(hotDeals)
    .values({
      organizationId: session.organizationId,
      title: v.title!,
      description: v.description!,
      terms: v.terms ?? null,
      discountLabel: v.discountLabel ?? null,
      redemptionInstructions: v.redemptionInstructions ?? null,
      dealUrl: v.dealUrl ?? null,
      startsAt: v.startsAt ?? null,
      endsAt: v.endsAt ?? null,
      isActive: v.isActive ?? true,
      isApproved: false, // staff moderates before it goes public
    })
    .returning({ id: hotDeals.id });

  return Response.json({ deal: { id: deal.id }, pending: true }, { status: 201 });
}

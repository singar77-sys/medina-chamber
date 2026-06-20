/**
 * PATCH / DELETE /api/portal/deals/[id] — a member edits or removes their OWN
 * deal. Every write is scoped to (id AND organizationId from the session), so a
 * member can never touch another org's deal. A content edit re-enters moderation
 * (isApproved → false); a pure pause/resume (isActive only) does not.
 */

import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const limited = await limitPortalProfile(req);
  if (limited) return limited;

  const session = await getSession();
  if (!session) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = buildDealValues(body, { requireCore: false });
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  const v = parsed.values;
  if (Object.keys(v).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const contentChanged = Object.keys(v).some((k) => k !== "isActive");

  const [updated] = await db
    .update(hotDeals)
    .set({ ...v, ...(contentChanged ? { isApproved: false } : {}), updatedAt: sql`now()` })
    .where(and(eq(hotDeals.id, id), eq(hotDeals.organizationId, session.organizationId)))
    .returning({ id: hotDeals.id });

  if (!updated) return Response.json({ error: "deal not found" }, { status: 404 });
  return Response.json({ deal: { id: updated.id }, reModerated: contentChanged });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;
  const [deleted] = await db
    .delete(hotDeals)
    .where(and(eq(hotDeals.id, id), eq(hotDeals.organizationId, session.organizationId)))
    .returning({ id: hotDeals.id });

  if (!deleted) return Response.json({ error: "deal not found" }, { status: 404 });
  return Response.json({ deleted: true });
}

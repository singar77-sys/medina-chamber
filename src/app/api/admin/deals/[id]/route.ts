/**
 * PATCH / DELETE /api/admin/deals/[id] — staff moderate (approve/reject via
 * isApproved), edit any field, or delete a deal. Admin only. Not org-scoped:
 * staff manage every member's deals.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { hotDeals } from "@/lib/db/schema";
import { buildDealValues } from "@/lib/deals-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const parsed = buildDealValues(body, { requireCore: false });
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });

  const update: Partial<typeof hotDeals.$inferInsert> = { ...parsed.values };
  // Moderation is an admin-only field (members can't self-approve).
  if ("isApproved" in body) update.isApproved = body.isApproved === true;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [deal] = await db
    .update(hotDeals)
    .set({ ...update, updatedAt: sql`now()` })
    .where(eq(hotDeals.id, id))
    .returning({ id: hotDeals.id, isApproved: hotDeals.isApproved });

  if (!deal) return Response.json({ error: "deal not found" }, { status: 404 });
  return Response.json({ deal });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;
  const [deleted] = await db
    .delete(hotDeals)
    .where(eq(hotDeals.id, id))
    .returning({ id: hotDeals.id });

  if (!deleted) return Response.json({ error: "deal not found" }, { status: 404 });
  return Response.json({ deleted: true });
}

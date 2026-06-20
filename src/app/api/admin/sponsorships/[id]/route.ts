/**
 * PATCH / DELETE /api/admin/sponsorships/[id] — staff work an inquiry through the
 * pipeline (status + internal note) or remove it. Admin only.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sponsorshipInquiries } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["new", "contacted", "won", "declined"]);

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

  const update: Partial<typeof sponsorshipInquiries.$inferInsert> = {};
  if ("status" in body) {
    if (typeof body.status !== "string" || !STATUSES.has(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status as typeof update.status;
  }
  if ("staffNote" in body) {
    update.staffNote =
      typeof body.staffNote === "string" && body.staffNote.trim() ? body.staffNote.trim() : null;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [inquiry] = await db
    .update(sponsorshipInquiries)
    .set({ ...update, updatedAt: sql`now()` })
    .where(eq(sponsorshipInquiries.id, id))
    .returning({ id: sponsorshipInquiries.id, status: sponsorshipInquiries.status });

  if (!inquiry) return Response.json({ error: "inquiry not found" }, { status: 404 });
  return Response.json({ inquiry });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;
  const [deleted] = await db
    .delete(sponsorshipInquiries)
    .where(eq(sponsorshipInquiries.id, id))
    .returning({ id: sponsorshipInquiries.id });

  if (!deleted) return Response.json({ error: "inquiry not found" }, { status: 404 });
  return Response.json({ deleted: true });
}

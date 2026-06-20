/**
 * /api/admin/committees/[id] — edit or delete a committee. Admin only.
 * Deleting a committee cascade-removes its committee_members rows.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { committees } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

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

  const update: Partial<typeof committees.$inferInsert> = {};
  if ("name" in body) {
    const v = str(body.name);
    if (!v || v.length > 120) {
      return Response.json({ error: "Name is required (max 120 chars)." }, { status: 400 });
    }
    update.name = v;
  }
  if ("description" in body) update.description = str(body.description); // null clears
  if ("meetingSchedule" in body) update.meetingSchedule = str(body.meetingSchedule);
  if ("isPublic" in body) update.isPublic = body.isPublic === true;
  if ("isActive" in body) update.isActive = body.isActive === true;

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [committee] = await db
    .update(committees)
    .set({ ...update, updatedAt: sql`now()` })
    .where(eq(committees.id, id))
    .returning();

  if (!committee) return Response.json({ error: "committee not found" }, { status: 404 });
  return Response.json({ committee });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;
  const [deleted] = await db
    .delete(committees)
    .where(eq(committees.id, id))
    .returning({ id: committees.id });

  if (!deleted) return Response.json({ error: "committee not found" }, { status: 404 });
  return Response.json({ deleted: true });
}

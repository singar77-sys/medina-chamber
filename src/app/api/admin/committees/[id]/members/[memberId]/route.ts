/**
 * DELETE /api/admin/committees/[id]/members/[memberId] — remove a member from a
 * committee roster. Admin only. Soft-remove (stamps leftAt) so the join/leave
 * history is preserved; scoped to the committee so an id can't be used to drop a
 * row from another committee.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { committeeMembers } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id, memberId } = await params;
  const [removed] = await db
    .update(committeeMembers)
    .set({ leftAt: new Date() })
    .where(
      and(
        eq(committeeMembers.id, memberId),
        eq(committeeMembers.committeeId, id),
        isNull(committeeMembers.leftAt),
      ),
    )
    .returning({ id: committeeMembers.id });

  if (!removed) return Response.json({ error: "member not found" }, { status: 404 });
  return Response.json({ removed: true });
}

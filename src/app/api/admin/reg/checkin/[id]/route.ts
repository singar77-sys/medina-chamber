/**
 * POST /api/admin/reg/checkin/[id] — check a registration in or out.
 *
 * Admin only (admin_session cookie). Body { checkedIn: boolean }. Checking in
 * stamps checkedInAt + sets status "attended"; checking out clears the stamp and
 * returns the registration to "confirmed". Only confirmed/attended registrations
 * can be checked in (you can't check in a waitlisted/pending/cancelled one).
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventRegistrations } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  if (typeof body.checkedIn !== "boolean") {
    return Response.json({ error: "checkedIn (boolean) is required." }, { status: 400 });
  }

  const [reg] = await db
    .select({ id: eventRegistrations.id, status: eventRegistrations.status })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, id))
    .limit(1);
  if (!reg) return Response.json({ error: "registration not found" }, { status: 404 });

  // Only a confirmed (or already-attended) registration can be checked in.
  if (reg.status !== "confirmed" && reg.status !== "attended") {
    return Response.json(
      { error: `Can't check in a ${reg.status} registration.` },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(eventRegistrations)
    .set(
      body.checkedIn
        ? { status: "attended", checkedInAt: sql`now()`, updatedAt: sql`now()` }
        : { status: "confirmed", checkedInAt: null, updatedAt: sql`now()` },
    )
    .where(eq(eventRegistrations.id, reg.id))
    .returning({
      id: eventRegistrations.id,
      status: eventRegistrations.status,
      checkedInAt: eventRegistrations.checkedInAt,
    });

  return Response.json({ registration: updated });
}

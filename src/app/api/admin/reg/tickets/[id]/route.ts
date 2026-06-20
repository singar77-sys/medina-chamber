/**
 * PATCH  /api/admin/reg/tickets/[id] — edit a ticket type.
 * DELETE /api/admin/reg/tickets/[id] — remove a ticket type.
 *
 * Admin only (admin_session cookie). DELETE refuses if any registration
 * already references the ticket — pulling a sold ticket out from under attendees
 * would orphan their records and corrupt the roster; cancel those first.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventTickets, eventRegistrations } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME = 200;
const MAX_PRICE = 1_000_000_00;

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

  const update: Partial<typeof eventTickets.$inferInsert> = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length > MAX_NAME) {
      return Response.json({ error: "Ticket name is required." }, { status: 400 });
    }
    update.name = name;
  }
  if ("priceCents" in body) {
    const p = body.priceCents;
    if (typeof p !== "number" || !Number.isInteger(p) || p < 0 || p > MAX_PRICE) {
      return Response.json({ error: "Price must be a whole number of cents." }, { status: 400 });
    }
    update.priceCents = p;
  }
  if ("description" in body) {
    update.description =
      typeof body.description === "string" ? body.description.trim().slice(0, 500) || null : null;
  }
  if ("isMemberOnly" in body) update.isMemberOnly = body.isMemberOnly === true;
  if ("sortOrder" in body && typeof body.sortOrder === "number" && Number.isInteger(body.sortOrder)) {
    update.sortOrder = body.sortOrder;
  }
  if ("maxQuantity" in body) {
    if (body.maxQuantity == null || body.maxQuantity === "") {
      update.maxQuantity = null;
    } else if (
      typeof body.maxQuantity !== "number" ||
      !Number.isInteger(body.maxQuantity) ||
      body.maxQuantity < 1
    ) {
      return Response.json({ error: "Max quantity must be a positive whole number or empty." }, { status: 400 });
    } else {
      update.maxQuantity = body.maxQuantity;
    }
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [ticket] = await db
    .update(eventTickets)
    .set(update)
    .where(eq(eventTickets.id, id))
    .returning();

  if (!ticket) return Response.json({ error: "ticket not found" }, { status: 404 });
  return Response.json({ ticket });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;

  // Refuse if any registration references this ticket.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.ticketId, id));

  if (count > 0) {
    return Response.json(
      { error: `Can't delete a ticket with ${count} registration(s). Cancel those first.` },
      { status: 409 },
    );
  }

  const [deleted] = await db
    .delete(eventTickets)
    .where(eq(eventTickets.id, id))
    .returning({ id: eventTickets.id });

  if (!deleted) return Response.json({ error: "ticket not found" }, { status: 404 });
  return Response.json({ ok: true });
}

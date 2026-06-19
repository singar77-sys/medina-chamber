/**
 * PATCH /api/admin/reg/events/[id] — update an event's registration settings.
 *
 * Admin only (Bearer CHAT_ADMIN_TOKEN). Whitelisted fields only: status
 * (publish/unpublish/cancel), maxCapacity, and the registration window. This is
 * how staff turn an imported event into a live, on-site-registerable one
 * (status → published, with tickets added separately).
 */

import { requireAdminToken } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set(["draft", "published", "cancelled", "completed"]);

/** Parse an ISO datetime string → Date, or null for empty, or "ERR". */
function parseDate(v: unknown): Date | null | "ERR" {
  if (v == null || v === "") return null;
  if (typeof v !== "string") return "ERR";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "ERR" : d;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const update: Partial<typeof events.$inferInsert> = {};

  if ("status" in body) {
    if (typeof body.status !== "string" || !STATUSES.has(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status as typeof update.status;
  }
  if ("maxCapacity" in body) {
    if (body.maxCapacity == null || body.maxCapacity === "") {
      update.maxCapacity = null;
    } else if (
      typeof body.maxCapacity !== "number" ||
      !Number.isInteger(body.maxCapacity) ||
      body.maxCapacity < 0
    ) {
      return Response.json({ error: "Capacity must be a whole number or empty." }, { status: 400 });
    } else {
      update.maxCapacity = body.maxCapacity;
    }
  }
  if ("registrationOpenAt" in body) {
    const d = parseDate(body.registrationOpenAt);
    if (d === "ERR") return Response.json({ error: "Invalid open date." }, { status: 400 });
    update.registrationOpenAt = d;
  }
  if ("registrationCloseAt" in body) {
    const d = parseDate(body.registrationCloseAt);
    if (d === "ERR") return Response.json({ error: "Invalid close date." }, { status: 400 });
    update.registrationCloseAt = d;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [event] = await db
    .update(events)
    .set({ ...update, updatedAt: sql`now()` })
    .where(eq(events.id, id))
    .returning({
      id: events.id,
      status: events.status,
      maxCapacity: events.maxCapacity,
    });

  if (!event) return Response.json({ error: "event not found" }, { status: 404 });
  return Response.json({ event });
}

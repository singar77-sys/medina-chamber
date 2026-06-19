/**
 * POST /api/admin/reg/events/[id]/tickets — create a ticket type for a DB event.
 *
 * Admin only: validated by the Bearer CHAT_ADMIN_TOKEN (requireAdminToken). The
 * admin page that calls this is additionally gated by proxy.ts (admin cookie);
 * the token is the API-layer check. Adding a ticket is what makes an event
 * "own" on-site registration (the public bridge requires ≥1 ticket).
 */

import { requireAdminToken } from "@/lib/admin-auth";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, eventTickets } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME = 200;
const MAX_PRICE = 1_000_000_00; // $1,000,000 ceiling — sanity bound

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { id: eventId } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_NAME) {
    return Response.json({ error: "Ticket name is required." }, { status: 400 });
  }

  const priceCents = body.priceCents;
  if (
    typeof priceCents !== "number" ||
    !Number.isInteger(priceCents) ||
    priceCents < 0 ||
    priceCents > MAX_PRICE
  ) {
    return Response.json(
      { error: "Price must be a whole number of cents (0 or more)." },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 500) || null
      : null;
  const isMemberOnly = body.isMemberOnly === true;
  const sortOrder =
    typeof body.sortOrder === "number" && Number.isInteger(body.sortOrder)
      ? body.sortOrder
      : 0;

  let maxQuantity: number | null = null;
  if (body.maxQuantity != null && body.maxQuantity !== "") {
    if (
      typeof body.maxQuantity !== "number" ||
      !Number.isInteger(body.maxQuantity) ||
      body.maxQuantity < 1
    ) {
      return Response.json(
        { error: "Max quantity must be a positive whole number, or empty for unlimited." },
        { status: 400 },
      );
    }
    maxQuantity = body.maxQuantity;
  }

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  if (!event) return Response.json({ error: "event not found" }, { status: 404 });

  const [ticket] = await db
    .insert(eventTickets)
    .values({
      eventId,
      name,
      description,
      priceCents,
      isMemberOnly,
      maxQuantity,
      sortOrder,
    })
    .returning();

  return Response.json({ ticket }, { status: 201 });
}

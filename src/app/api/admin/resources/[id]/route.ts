/**
 * PATCH / DELETE /api/admin/resources/[id] — edit or remove a resource. Admin only.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { resources } from "@/lib/db/schema";
import { buildResourceValues } from "@/lib/resources-input";

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

  const result = buildResourceValues(body, { requireCore: false });
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });
  if (Object.keys(result.values).length === 0) {
    return Response.json({ error: "No editable fields provided." }, { status: 400 });
  }

  const [row] = await db
    .update(resources)
    .set({ ...result.values, updatedAt: sql`now()` })
    .where(eq(resources.id, id))
    .returning({ id: resources.id });

  if (!row) return Response.json({ error: "resource not found" }, { status: 404 });
  return Response.json({ resource: row });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;
  const [row] = await db
    .delete(resources)
    .where(eq(resources.id, id))
    .returning({ id: resources.id });

  if (!row) return Response.json({ error: "resource not found" }, { status: 404 });
  return Response.json({ deleted: true });
}

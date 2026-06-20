/**
 * GET  /api/admin/resources — full list (drafts + member-only) for the manager.
 * POST /api/admin/resources — create a resource.
 * Admin only (admin_session cookie).
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { resources } from "@/lib/db/schema";
import { getAdminResources } from "@/lib/resources";
import { buildResourceValues } from "@/lib/resources-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const items = await getAdminResources(db);
  return Response.json({ resources: items });
}

export async function POST(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const result = buildResourceValues(body, { requireCore: true });
  if ("error" in result) return Response.json({ error: result.error }, { status: 400 });

  const [row] = await db.insert(resources).values(result.values).returning({ id: resources.id });
  return Response.json({ resource: row }, { status: 201 });
}

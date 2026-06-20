/**
 * /api/admin/committees — list all committees (with active-member counts) and
 * create one. Admin only (admin_session cookie via requireAdminSession).
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { committees, committeeMembers } from "@/lib/db/schema";
import { generateCommitteeSlug } from "@/lib/committees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const rows = await db
    .select({
      id: committees.id,
      name: committees.name,
      slug: committees.slug,
      description: committees.description,
      meetingSchedule: committees.meetingSchedule,
      isPublic: committees.isPublic,
      isActive: committees.isActive,
      memberCount: sql<number>`coalesce(count(${committeeMembers.id}) filter (where ${committeeMembers.leftAt} is null), 0)::int`,
    })
    .from(committees)
    .leftJoin(committeeMembers, eq(committeeMembers.committeeId, committees.id))
    .groupBy(committees.id)
    .orderBy(asc(committees.name));

  return Response.json({ committees: rows });
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

  const name = str(body.name);
  if (!name || name.length > 120) {
    return Response.json({ error: "Committee name is required (max 120 chars)." }, { status: 400 });
  }
  const description = str(body.description);
  const meetingSchedule = str(body.meetingSchedule);
  const isPublic = body.isPublic !== false; // default true
  const isActive = body.isActive !== false; // default true

  const slug = await generateCommitteeSlug(db, name);
  try {
    const [committee] = await db
      .insert(committees)
      .values({ name, slug, description, meetingSchedule, isPublic, isActive })
      .returning();
    return Response.json({ committee }, { status: 201 });
  } catch (err) {
    // Rare race: a concurrent create resolved the same free slug first. The
    // unique constraint fails safe — surface a clean 409 instead of a 500.
    if (typeof err === "object" && err !== null && (err as { code?: unknown }).code === "23505") {
      return Response.json({ error: "A committee with that name already exists." }, { status: 409 });
    }
    throw err;
  }
}

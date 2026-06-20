/**
 * GET /api/admin/sponsorships — the sponsorship inquiry queue (new first).
 * Admin only (admin_session cookie).
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getSponsorships } from "@/lib/sponsorships";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const inquiries = await getSponsorships(db);
  return Response.json({ inquiries });
}

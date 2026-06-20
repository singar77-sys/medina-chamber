/**
 * GET /api/admin/deals — all hot deals for the moderation view (pending first).
 * Admin only (admin_session cookie).
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { getAdminDeals } from "@/lib/deals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const deals = await getAdminDeals(db);
  return Response.json({ deals });
}

/**
 * POST /api/admin/campaigns/preview — how many recipients a segment resolves to.
 *
 * Admin only (Bearer CHAT_ADMIN_TOKEN). Powers the composer's "this will reach
 * N members" readout. Body is the CampaignSegment itself; no campaign required.
 */

import { requireAdminToken } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import type { CampaignSegment } from "@/lib/db/schema";
import { resolveAudience } from "@/lib/email/audience";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const segment = body && typeof body === "object" ? (body as CampaignSegment) : {};

  const audience = await resolveAudience(db, segment);
  return Response.json({ count: audience.length });
}

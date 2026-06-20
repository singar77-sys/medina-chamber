/**
 * POST /api/admin/campaigns/[id]/send — send a draft campaign now.
 *
 * Admin only (Bearer CHAT_ADMIN_TOKEN). Delegates to the idempotent send
 * engine: a campaign that's already sending/sent is refused with 409, so a
 * double-click can't blast members twice.
 */

import { requireAdminToken } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { sendCampaign } from "@/lib/email/campaign-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const { id } = await params;

  let result: Awaited<ReturnType<typeof sendCampaign>>;
  try {
    result = await sendCampaign(db, id);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      return Response.json({ error: "campaign not found" }, { status: 404 });
    }
    console.error("[campaigns/send] failed:", err);
    return Response.json({ error: "send failed" }, { status: 500 });
  }

  if (result.skipped) {
    return Response.json({ error: result.skipped, ...result }, { status: 409 });
  }
  return Response.json({ result });
}

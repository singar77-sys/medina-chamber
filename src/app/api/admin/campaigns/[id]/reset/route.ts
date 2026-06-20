/**
 * POST /api/admin/campaigns/[id]/reset — recover a campaign stranded in "sending".
 *
 * Admin only (admin_session cookie).
 *
 * The send engine atomically claims a campaign (draft/scheduled → "sending")
 * before it sends. If a catastrophic error escapes after that claim (e.g. the
 * final status write throws), the campaign is stranded in "sending" forever:
 * "sending" is not editable (PATCH), not deletable (DELETE), and not re-sendable
 * (sendCampaign refuses anything that isn't draft/scheduled). This route is the
 * only way out.
 *
 * Recovery branches on the audit trail (email_sends), because a strand can have
 * reached either nobody or some recipients:
 *
 *   • 0 delivered rows → reset to "draft". Nobody received it, so staff can fix
 *     and re-send. Safe: there are no delivered rows to double up on.
 *   • ≥1 delivered row → terminal "sent_with_errors" (reconciling sentCount).
 *     The blast partially went out, so it must NEVER return to a re-sendable
 *     state — that would double-blast the recipients who already got it.
 *
 * This makes the no-double-send guarantee structural: a campaign can only become
 * re-sendable (draft) when zero recipients have received it. A "delivered" row
 * is any email_sends row whose status is NOT "failed" — "queued" is counted as
 * possibly-delivered (conservative: we never risk a double-send).
 *
 * email_sends rows are left intact in every case (the audit trail is permanent).
 *
 * Guards against racing a genuinely in-flight send:
 *   • only acts on status "sending";
 *   • only when it has been sending for more than STALE_SENDING_MINUTES (the
 *     claim stamps updatedAt at start, and the only other write during a send is
 *     the final flip to "sent", so a still-"sending" updatedAt is the start time);
 *   • the state change is an atomic conditional UPDATE … WHERE status='sending',
 *     so a send that finishes between our read and our write can't be clobbered.
 */

import { requireAdminSession } from "@/lib/admin-auth";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailCampaigns, emailSends } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A "sending" campaign older than this is treated as stranded, not in-flight. */
const STALE_SENDING_MINUTES = 15;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const { id } = await params;

  const [existing] = await db
    .select({ status: emailCampaigns.status, updatedAt: emailCampaigns.updatedAt })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);

  if (!existing) return Response.json({ error: "campaign not found" }, { status: 404 });
  if (existing.status !== "sending") {
    return Response.json(
      { error: `Only a stuck "sending" campaign can be reset (this one is ${existing.status}).` },
      { status: 409 },
    );
  }

  const staleBefore = new Date(Date.now() - STALE_SENDING_MINUTES * 60_000);
  if (existing.updatedAt && existing.updatedAt > staleBefore) {
    return Response.json(
      {
        error: `Campaign has been sending for under ${STALE_SENDING_MINUTES} minutes; it may still be in flight. Try again later.`,
      },
      { status: 409 },
    );
  }

  // How many recipients already received this? Any non-"failed" send row means
  // the email left our system; that's what decides draft vs. terminal.
  const [{ delivered }] = await db
    .select({ delivered: sql<number>`count(*)::int` })
    .from(emailSends)
    .where(and(eq(emailSends.campaignId, id), ne(emailSends.status, "failed")));

  const set =
    delivered > 0
      ? { status: "sent_with_errors" as const, sentCount: delivered, updatedAt: new Date() }
      : { status: "draft" as const, updatedAt: new Date() };

  // Atomic conditional update (mirrors the engine's claim): only act while the
  // row is still "sending" and still stale, so a send that just finished
  // (→ "sent") or a concurrent reset can't be clobbered.
  const [reset] = await db
    .update(emailCampaigns)
    .set(set)
    .where(
      and(
        eq(emailCampaigns.id, id),
        eq(emailCampaigns.status, "sending"),
        lt(emailCampaigns.updatedAt, staleBefore),
      ),
    )
    .returning({ id: emailCampaigns.id, status: emailCampaigns.status });

  if (!reset) {
    return Response.json(
      { error: "Campaign is no longer in a resettable state (it may have just finished sending)." },
      { status: 409 },
    );
  }

  return Response.json({ reset: { id: reset.id, status: reset.status, delivered } });
}

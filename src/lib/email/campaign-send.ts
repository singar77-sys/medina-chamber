/**
 * sendCampaign — send a draft campaign to its resolved audience.
 *
 * Idempotent: the campaign is atomically claimed (draft/scheduled → sending) so
 * a double-click or concurrent call can't send twice. Each recipient gets an
 * email_sends row (the audit trail + the key the Resend webhook correlates on
 * via resendMessageId) and a personalized, signed one-click unsubscribe link +
 * List-Unsubscribe header. Sends in batches of 100 (Resend's batch cap).
 *
 * A batch that fails marks just its own sends "failed" and the loop continues —
 * a transient Resend hiccup never aborts the whole campaign.
 */

import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { emailCampaigns, emailSends } from "@/lib/db/schema";
import { resend } from "@/lib/email";
import { resolveAudience } from "./audience";
import { signUnsubscribeToken } from "./unsubscribe-token";

const BATCH_SIZE = 100;

export interface SendCampaignResult {
  sent: number;
  recipients: number;
  skipped?: string;
}

function unsubscribeFooter(url: string): string {
  return `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;font-family:system-ui,-apple-system,sans-serif">
  <p style="margin:0;font-size:12px;color:#94a3b8">Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256</p>
  <p style="margin:6px 0 0;font-size:12px;color:#94a3b8"><a href="${url}" style="color:#94a3b8;text-decoration:underline">Unsubscribe</a> from chamber emails.</p>
</div>`;
}

/** Best-effort: flag a batch's send rows as failed (never throws). */
async function markFailed(db: DB, rows: { id: string }[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    await db
      .update(emailSends)
      .set({ status: "failed" })
      .where(inArray(emailSends.id, rows.map((r) => r.id)));
  } catch (err) {
    console.error("[campaign-send] could not mark batch failed:", err);
  }
}

export async function sendCampaign(db: DB, campaignId: string): Promise<SendCampaignResult> {
  const [campaign] = await db
    .select({
      id: emailCampaigns.id,
      subject: emailCampaigns.subject,
      fromName: emailCampaigns.fromName,
      fromEmail: emailCampaigns.fromEmail,
      replyTo: emailCampaigns.replyTo,
      htmlBody: emailCampaigns.htmlBody,
      status: emailCampaigns.status,
      segmentFilter: emailCampaigns.segmentFilter,
    })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error(`campaign not found: ${campaignId}`);
  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return { sent: 0, recipients: 0, skipped: `campaign is already ${campaign.status}` };
  }
  if (!campaign.htmlBody) {
    return { sent: 0, recipients: 0, skipped: "campaign has no body" };
  }

  // Atomically claim the campaign so a concurrent send can't double-fire.
  const [claimed] = await db
    .update(emailCampaigns)
    .set({ status: "sending", updatedAt: new Date() })
    .where(and(eq(emailCampaigns.id, campaignId), inArray(emailCampaigns.status, ["draft", "scheduled"])))
    .returning({ id: emailCampaigns.id });
  if (!claimed) return { sent: 0, recipients: 0, skipped: "already sending" };

  const audience = await resolveAudience(db, campaign.segmentFilter ?? {});
  await db
    .update(emailCampaigns)
    .set({ recipientCount: audience.length })
    .where(eq(emailCampaigns.id, campaignId));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://medinaohchamber.com";
  const from = `${campaign.fromName} <${campaign.fromEmail}>`;
  let sent = 0;

  for (let i = 0; i < audience.length; i += BATCH_SIZE) {
    const chunk = audience.slice(i, i + BATCH_SIZE);
    // The insert + send + per-row updates all live in this try so a transient
    // DB or Resend error on one batch marks just that batch and the loop
    // continues — it can never abort the run and strand the campaign in
    // "sending" (which is non-editable / non-resendable).
    let inserted: { id: string }[] = [];
    try {
      inserted = await db
        .insert(emailSends)
        .values(chunk.map((m) => ({ campaignId, contactId: m.contactId, email: m.email, status: "queued" as const })))
        .returning({ id: emailSends.id });

      const payloads = chunk.map((m) => {
        const unsubUrl = `${siteUrl}/api/email/unsubscribe?token=${signUnsubscribeToken(m.contactId)}`;
        return {
          from,
          to: m.email,
          subject: campaign.subject,
          html: `${campaign.htmlBody}${unsubscribeFooter(unsubUrl)}`,
          replyTo: campaign.replyTo ?? undefined,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        };
      });

      // resend.batch.send RESOLVES (does not throw) with { data: null, error }
      // on rate-limit / quota / 5xx, and may return fewer ids than inputs.
      // Either way the batch failed: never mark a row "sent" without its real
      // message id, or its open/click/bounce webhooks can never correlate.
      const res = await resend.batch.send(payloads);
      const ids = res.data?.data;
      if (res.error || !ids || ids.length !== chunk.length) {
        console.error(
          "[campaign-send] batch failed:",
          res.error ?? `received ${ids?.length ?? 0}/${chunk.length} ids`,
        );
        await markFailed(db, inserted);
        continue;
      }

      for (let j = 0; j < chunk.length; j++) {
        await db
          .update(emailSends)
          .set({ status: "sent", sentAt: new Date(), resendMessageId: ids[j].id })
          .where(eq(emailSends.id, inserted[j].id));
      }
      sent += chunk.length;
    } catch (err) {
      console.error("[campaign-send] batch threw:", err);
      await markFailed(db, inserted);
    }
  }

  // Reflect the real outcome: 'sent' only when every recipient was delivered.
  // A partial or total failure becomes 'sent_with_errors' (terminal + non-
  // resendable, so the recipients who DID get it aren't re-blasted on a retry) —
  // a fully-failed blast must never masquerade as a clean send. sentCount carries
  // the real delivered number either way.
  const finalStatus = sent === audience.length ? "sent" : "sent_with_errors";
  await db
    .update(emailCampaigns)
    .set({ status: finalStatus, sentAt: new Date(), sentCount: sent, updatedAt: new Date() })
    .where(eq(emailCampaigns.id, campaignId));

  return { sent, recipients: audience.length };
}

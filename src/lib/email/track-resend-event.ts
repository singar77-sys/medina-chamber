/**
 * recordResendEvent — apply a Resend webhook event to our own tracking tables.
 *
 * Correlates on emailSends.resendMessageId. Every counter increment is gated on
 * the relevant timestamp being null and committed via a guarded UPDATE …
 * RETURNING, so Resend's at-least-once redelivery can't inflate open/click/
 * bounce counts. Opens and clicks also drop an engagement_event for the member
 * ROI dashboard; a PERMANENT (hard) bounce bumps the contact's bounceCount (so
 * resolveAudience suppresses repeat hard-bouncers) — a "Temporary" bounce (full
 * mailbox, greylisting, transient DNS) does NOT, so a blip never permanently
 * suppresses a deliverable address; a spam complaint hard-unsubscribes the contact.
 *
 * Unknown / delivery-only event types are no-ops. An event for a message we
 * never sent (no matching send row) is silently ignored.
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { emailSends, emailCampaigns, contacts, engagementEvents } from "@/lib/db/schema";

export async function recordResendEvent(
  db: DB,
  type: string,
  messageId: string,
  /** Resend's data.bounce.type ("Permanent" | "Temporary"); only "Permanent"
   *  counts toward contact-level suppression. */
  bounceType?: string | null,
): Promise<void> {
  const [send] = await db
    .select({
      id: emailSends.id,
      campaignId: emailSends.campaignId,
      contactId: emailSends.contactId,
      organizationId: contacts.organizationId,
    })
    .from(emailSends)
    .leftJoin(contacts, eq(emailSends.contactId, contacts.id))
    .where(eq(emailSends.resendMessageId, messageId))
    .limit(1);

  if (!send) return; // not one of ours

  switch (type) {
    case "email.opened": {
      const [flipped] = await db
        .update(emailSends)
        .set({ status: "opened", openedAt: sql`now()` })
        .where(and(eq(emailSends.id, send.id), isNull(emailSends.openedAt)))
        .returning({ id: emailSends.id });
      if (!flipped) return;
      await db
        .update(emailCampaigns)
        .set({ openCount: sql`${emailCampaigns.openCount} + 1` })
        .where(eq(emailCampaigns.id, send.campaignId));
      await db.insert(engagementEvents).values({
        organizationId: send.organizationId,
        contactId: send.contactId,
        eventType: "email_opened",
        metadata: { campaignId: send.campaignId },
      });
      return;
    }
    case "email.clicked": {
      const [flipped] = await db
        .update(emailSends)
        .set({ status: "clicked", clickedAt: sql`now()` })
        .where(and(eq(emailSends.id, send.id), isNull(emailSends.clickedAt)))
        .returning({ id: emailSends.id });
      if (!flipped) return;
      await db
        .update(emailCampaigns)
        .set({ clickCount: sql`${emailCampaigns.clickCount} + 1` })
        .where(eq(emailCampaigns.id, send.campaignId));
      await db.insert(engagementEvents).values({
        organizationId: send.organizationId,
        contactId: send.contactId,
        eventType: "email_clicked",
        metadata: { campaignId: send.campaignId },
      });
      return;
    }
    case "email.bounced": {
      const [flipped] = await db
        .update(emailSends)
        .set({ status: "bounced", bouncedAt: sql`now()` })
        .where(and(eq(emailSends.id, send.id), isNull(emailSends.bouncedAt)))
        .returning({ id: emailSends.id });
      if (!flipped) return;
      await db
        .update(emailCampaigns)
        .set({ bounceCount: sql`${emailCampaigns.bounceCount} + 1` })
        .where(eq(emailCampaigns.id, send.campaignId));
      // Only a PERMANENT (hard) bounce counts toward contact-level suppression
      // (resolveAudience drops a contact at MAX_BOUNCES). Resend also emits
      // email.bounced for "Temporary" bounces (full mailbox, greylisting, transient
      // DNS) — those must NOT permanently suppress an otherwise-deliverable address.
      if (send.contactId && bounceType === "Permanent") {
        await db
          .update(contacts)
          .set({ bounceCount: sql`${contacts.bounceCount} + 1`, lastBouncedAt: sql`now()` })
          .where(eq(contacts.id, send.contactId));
      }
      return;
    }
    case "email.complained": {
      // Spam complaint = hard unsubscribe; never email them again.
      await db.update(emailSends).set({ status: "spam" }).where(eq(emailSends.id, send.id));
      if (send.contactId) {
        const [flipped] = await db
          .update(contacts)
          .set({ unsubscribedAt: sql`now()` })
          .where(and(eq(contacts.id, send.contactId), isNull(contacts.unsubscribedAt)))
          .returning({ id: contacts.id });
        if (flipped) {
          await db
            .update(emailCampaigns)
            .set({ unsubscribeCount: sql`${emailCampaigns.unsubscribeCount} + 1` })
            .where(eq(emailCampaigns.id, send.campaignId));
        }
      }
      return;
    }
    default:
      return; // email.sent / email.delivered / etc. — no-op
  }
}

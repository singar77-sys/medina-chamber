/**
 * processRenewalPayment — the payment leg of the renewal lifecycle.
 *
 * The renewal engine (src/lib/renewal-engine.ts) creates a renewal invoice 60
 * days before renewalDate with periodStart = renewalDate and periodEnd =
 * renewalDate + 1yr, and nudges the member to /portal to pay it. When that
 * invoice is paid (recorded to the ledger by the Stripe webhook's dues path),
 * THIS function advances the membership: renewalDate → periodEnd and status →
 * active (reactivating a past_due or lapsed member who pays).
 *
 * Idempotent + correct: the advance is a single guarded UPDATE … WHERE
 * renewalDate = periodStart, so a redelivered webhook (renewalDate already moved
 * to periodEnd) is a no-op, and a stale/old invoice can't advance a membership
 * that has already moved on to a later period. Safe to call for ANY paid invoice
 * — a non-renewal invoice (no membershipId / no period) simply returns false.
 *
 * One-directional: a later refund (charge.refunded) is an AR event in the
 * immutable ledger and intentionally does NOT roll back an advanced renewalDate
 * or status. Lifecycle reversal, if ever wanted, belongs in the refund path.
 */

import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@/lib/db";
import {
  invoices,
  memberships,
  membershipStatus,
  organizations,
  membershipTiers,
  contacts,
} from "@/lib/db/schema";
import { sendRenewalConfirmation } from "./renewal-email";
import { logEngagement } from "@/lib/engagement";

export async function processRenewalPayment(db: DB, invoiceId: string): Promise<boolean> {
  const [inv] = await db
    .select({
      membershipId: invoices.membershipId,
      periodStart: invoices.periodStart,
      periodEnd: invoices.periodEnd,
      status: invoices.status,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  // Only a fully-paid renewal invoice (has a membership + a billing period) advances anything.
  if (!inv || !inv.membershipId || !inv.periodStart || !inv.periodEnd) return false;
  if (inv.status !== "paid") return false;

  const [advanced] = await db
    .update(memberships)
    .set({ status: "active", renewalDate: inv.periodEnd, updatedAt: new Date() })
    .where(
      and(
        eq(memberships.id, inv.membershipId),
        eq(memberships.renewalDate, inv.periodStart),
        // Renewable states only — a cancelled (deliberately-left) membership must
        // never silently reactivate by paying a stale renewal invoice.
        inArray(
          memberships.status,
          ["active", "past_due", "lapsed"] as (typeof membershipStatus.enumValues)[number][],
        ),
      ),
    )
    .returning({ id: memberships.id, organizationId: memberships.organizationId });

  if (!advanced) return false; // already advanced for this period, or not the current renewal

  // Member-ROI signal — a completed renewal. Best-effort, never blocks the renewal.
  await logEngagement(db, {
    eventType: "renewal_completed",
    organizationId: advanced.organizationId,
    metadata: { invoiceId, renewedThrough: inv.periodEnd },
  });

  // Best-effort confirmation to the primary contact — never blocks the renewal.
  try {
    const [info] = await db
      .select({
        orgName: organizations.name,
        tierName: membershipTiers.name,
        email: contacts.email,
        firstName: contacts.firstName,
      })
      .from(memberships)
      .leftJoin(organizations, eq(memberships.organizationId, organizations.id))
      .leftJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
      .leftJoin(
        contacts,
        and(eq(contacts.organizationId, memberships.organizationId), eq(contacts.isPrimaryContact, true)),
      )
      .where(eq(memberships.id, inv.membershipId))
      .limit(1);

    if (info?.email) {
      await sendRenewalConfirmation({
        to: info.email,
        firstName: info.firstName ?? "there",
        orgName: info.orgName ?? "your business",
        tierName: info.tierName ?? "membership",
        renewedThrough: inv.periodEnd,
      });
    }
  } catch (err) {
    console.error("[renewal] confirmation lookup/send failed:", err);
  }

  return true;
}

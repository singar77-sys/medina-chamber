/**
 * processJoinPayment — the Stripe webhook's handler for a join (type:"join")
 * payment. Records the charge in the ledger (idempotent on stripeChargeId),
 * activates the membership + org (idempotent on status='pending'), and — only on
 * the actual pending→active transition — sends the welcome + staff emails. A
 * redelivered webhook records nothing new and sends no duplicate email.
 */

import { and, eq } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { memberships, organizations, membershipTiers, contacts } from "@/lib/db/schema";
import { recordPayment } from "@/lib/billing/ledger";
import { activateMembership } from "./join";
import { sendWelcomeEmail, notifyStaffNewMember } from "./welcome-email";

export interface ProcessJoinPaymentInput {
  organizationId: string;
  invoiceId: string;
  membershipId: string;
  amountReceived: number;
  stripeChargeId?: string;
  stripePaymentMethodId?: string;
}

export async function processJoinPayment(
  db: DB,
  input: ProcessJoinPaymentInput,
): Promise<void> {
  await recordPayment(db, {
    organizationId: input.organizationId,
    invoiceId: input.invoiceId,
    type: "charge",
    method: "card",
    amountCents: input.amountReceived,
    stripeChargeId: input.stripeChargeId,
    stripePaymentMethodId: input.stripePaymentMethodId,
  });

  const activated = await activateMembership(db, input.membershipId, input.organizationId);
  if (!activated) return; // redelivery / already active → no duplicate emails

  const [row] = await db
    .select({
      orgName: organizations.name,
      tierName: membershipTiers.name,
      cFirst: contacts.firstName,
      cLast: contacts.lastName,
      cEmail: contacts.email,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .innerJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
    .leftJoin(
      contacts,
      and(
        eq(contacts.organizationId, memberships.organizationId),
        eq(contacts.isPrimaryContact, true),
      ),
    )
    .where(eq(memberships.id, input.membershipId))
    .limit(1);

  if (!row?.cEmail) return; // can't welcome without an address

  await sendWelcomeEmail({
    to: row.cEmail,
    firstName: row.cFirst ?? "there",
    businessName: row.orgName,
    tierName: row.tierName,
  });
  await notifyStaffNewMember({
    businessName: row.orgName,
    contactName: `${row.cFirst ?? ""} ${row.cLast ?? ""}`.trim(),
    email: row.cEmail,
    tierName: row.tierName,
    amountCents: input.amountReceived,
  });
}

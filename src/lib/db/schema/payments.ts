/**
 * payments — immutable payment ledger.
 *
 * Invariant: rows are never updated. Refunds create a new negative-amount row.
 * This gives a complete, auditable AR journal — the core of the
 * "billing you can trust" differentiator vs GrowthZone's mutable invoice totals.
 *
 * invoice.amount_paid_cents is derived from SUM(payments.amount_cents)
 * for that invoice. The source of truth is this table.
 */

import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { invoices } from "./memberships";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const paymentType = pgEnum("payment_type", [
  "charge",    // successful card or ACH capture
  "refund",    // full or partial refund (amountCents is negative)
  "credit",    // manual credit applied by staff (amountCents is negative)
  "writeoff",  // bad debt written off (amountCents is negative)
]);

export const paymentMethod = pgEnum("payment_method", [
  "card",
  "ach",
  "check",
  "cash",
  "other",
]);

// ── payments ───────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),

  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id),

  type: paymentType("type").notNull(),
  method: paymentMethod("method").notNull().default("card"),

  // Positive for charges; negative for refunds, credits, writeoffs. Never a float.
  amountCents: integer("amount_cents").notNull(),

  // Stripe correlation — unique so webhooks are idempotent
  stripeChargeId: text("stripe_charge_id").unique(),
  stripeRefundId: text("stripe_refund_id").unique(),
  stripePaymentMethodId: text("stripe_payment_method_id"),

  // GrowthZone import idempotency key
  gzId: text("gz_id").unique(),

  // Human-readable memo — required for check/cash/manual entries
  memo: text("memo"),

  // Clerk user ID of the staff member who recorded this.
  // Null = recorded automatically via Stripe webhook.
  recordedByStaffId: text("recorded_by_staff_id"),

  // When the money actually moved (may differ from createdAt for manual entries)
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organizations, {
    fields: [payments.organizationId],
    references: [organizations.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

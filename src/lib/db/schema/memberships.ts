/**
 * membership_tiers  — Silver / Gold / Visibility Plus + pricing
 * memberships       — an org's active membership record + Stripe subscription
 * invoices          — billing records (dues, event fees, ad purchases)
 */

import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const membershipStatus = pgEnum("membership_status", [
  "pending",
  "trial",
  "active",
  "past_due",
  "lapsed",
  "cancelled",
]);

export const billingCycle = pgEnum("billing_cycle", ["annual", "monthly"]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "pending",
  "paid",
  "past_due",
  "void",
  "uncollectible",
]);

// ── membership_tiers ───────────────────────────────────────────────────────────

export const membershipTiers = pgTable("membership_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),           // "Silver", "Gold", "Visibility Plus"
  slug: text("slug").unique().notNull(),  // "silver", "gold", "visibility-plus"
  description: text("description"),

  // Prices in cents — never floats for money
  annualPriceCents: integer("annual_price_cents").notNull(),
  monthlyPriceCents: integer("monthly_price_cents"),

  // Stripe price IDs — set after creating products in Stripe
  stripePriceIdAnnual: text("stripe_price_id_annual"),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),

  // What members get — displayed in the membership upgrade flow
  benefits: jsonb("benefits").$type<string[]>(),

  // Display order (lower = shown first)
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── memberships ────────────────────────────────────────────────────────────────

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  tierId: uuid("tier_id")
    .notNull()
    .references(() => membershipTiers.id),

  status: membershipStatus("status").notNull().default("pending"),
  billingCycle: billingCycle("billing_cycle").notNull().default("annual"),

  startDate: date("start_date").notNull(),
  renewalDate: date("renewal_date").notNull(),

  // Stripe
  stripeSubscriptionId: text("stripe_subscription_id").unique(),

  // GrowthZone migration reference
  gzId: text("gz_id").unique(),

  // When the membership entered past_due — the lapse grace window is measured from
  // here, not renewal_date, so a cron gap can't lapse a member with zero grace
  // (off-journal migration 0008).
  pastDueSince: timestamp("past_due_since", { withTimezone: true }),

  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── invoices ───────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmountCents: number;
  totalCents: number;
}

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  membershipId: uuid("membership_id").references(() => memberships.id),

  // Stripe references
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // GrowthZone import idempotency key
  gzId: text("gz_id").unique(),

  // Amounts in cents
  amountCents: integer("amount_cents").notNull(),
  amountPaidCents: integer("amount_paid_cents").notNull().default(0),

  status: invoiceStatus("status").notNull().default("draft"),
  description: text("description"),

  dueDate: date("due_date"),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  // Billing period this invoice covers
  periodStart: date("period_start"),
  periodEnd: date("period_end"),

  // Last renewal-notice stage (days-out: 30 or 7) emailed for this invoice;
  // null = none. Lets the daily renewal cron skip notices it already sent, so a
  // same-day re-run / retry can't re-spam the member. (Off-journal migration 0004.)
  renewalNoticeSentDays: integer("renewal_notice_sent_days"),

  lineItems: jsonb("line_items").$type<InvoiceLineItem[]>(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const membershipTiersRelations = relations(membershipTiers, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  tier: one(membershipTiers, {
    fields: [memberships.tierId],
    references: [membershipTiers.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  membership: one(memberships, {
    fields: [invoices.membershipId],
    references: [memberships.id],
  }),
}));

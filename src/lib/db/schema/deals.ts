/**
 * hot_deals — member-to-member deals / coupons a member offers to the community.
 *
 * Replaces GrowthZone's Hot Deals module and feeds the public /deals page (the
 * "come to the chamber site" destination). A deal is owned by the offering org;
 * member-submitted deals start unapproved and go public only after staff
 * moderation (isApproved). Feeds engagement_events.hot_deal_view / referral_click.
 */

import { boolean, date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";

export const hotDeals = pgTable("hot_deals", {
  id: uuid("id").primaryKey().defaultRandom(),

  // The member offering the deal.
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description").notNull(),
  terms: text("terms"),                                   // fine print / restrictions
  discountLabel: text("discount_label"),                  // "20% off", "$10 off", "BOGO"
  redemptionInstructions: text("redemption_instructions"),
  dealUrl: text("deal_url"),                              // optional landing page for the offer

  // Validity window — null startsAt = available now, null endsAt = ongoing.
  startsAt: date("starts_at"),
  endsAt: date("ends_at"),

  isActive: boolean("is_active").notNull().default(true),     // member can pause
  isApproved: boolean("is_approved").notNull().default(false), // staff moderation gate

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hotDealsRelations = relations(hotDeals, ({ one }) => ({
  organization: one(organizations, {
    fields: [hotDeals.organizationId],
    references: [organizations.id],
  }),
}));

/**
 * sponsorship_inquiries — businesses applying to sponsor chamber events/programs.
 *
 * Replaces GrowthZone's sponsorship intake. A public anti-spam form writes a row
 * (status 'new'); staff work it through the admin queue. Standalone — the
 * applicant may not be a member yet, so there's no org FK.
 */

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const sponsorshipInquiries = pgTable("sponsorship_inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),

  businessName: text("business_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  interest: text("interest"),   // which sponsorship / level they're interested in
  message: text("message"),

  // text-enum (no pg enum type → simpler off-journal migration); CHECK enforced in 0006.
  status: text("status", { enum: ["new", "contacted", "won", "declined"] }).notNull().default("new"),
  staffNote: text("staff_note"), // internal note from staff

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

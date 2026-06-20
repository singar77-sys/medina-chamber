/**
 * email_campaigns — staff-sent blasts to member segments
 * email_sends     — per-recipient delivery + engagement tracking
 *
 * Replaces GrowthZone's email module (rated 2.0/5).
 * Backed by Resend for delivery.
 */

import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { contacts } from "./organizations";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Filter criteria for who receives a campaign */
export interface CampaignSegment {
  /** Membership tier slugs to include — empty = all tiers */
  tiers?: string[];
  /** Organization status values to include — default: ["active"] */
  statuses?: string[];
  /** Category slugs to include — empty = all categories */
  categories?: string[];
  /** Specific organization IDs to include (override other filters) */
  organizationIds?: string[];
  /** Exclude contacts who haven't opened an email in this many days */
  excludeInactiveDays?: number;
}

// ── Enums ──────────────────────────────────────────────────────────────────────

export const campaignStatus = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  // Terminal recovery state for a send that was stranded mid-flight after it
  // had already reached some recipients. Set by the admin reset route; never
  // re-sendable (re-sending would double-blast the delivered recipients).
  "sent_with_errors",
  "cancelled",
]);

export const sendStatus = pgEnum("send_status", [
  "queued",
  "sent",
  "opened",
  "clicked",
  "bounced",
  "unsubscribed",
  "spam",
  "failed",
]);

// ── email_campaigns ────────────────────────────────────────────────────────────

export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),         // internal label, never shown to recipients
  subject: text("subject").notNull(),
  fromName: text("from_name").notNull(),
  fromEmail: text("from_email").notNull(),
  replyTo: text("reply_to"),

  htmlBody: text("html_body"),
  textBody: text("text_body"),

  status: campaignStatus("status").notNull().default("draft"),

  // Who gets this — evaluated at send time
  segmentFilter: jsonb("segment_filter").$type<CampaignSegment>(),

  // Counters (updated as Resend webhooks arrive)
  recipientCount: integer("recipient_count").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  openCount: integer("open_count").notNull().default(0),
  clickCount: integer("click_count").notNull().default(0),
  bounceCount: integer("bounce_count").notNull().default(0),
  unsubscribeCount: integer("unsubscribe_count").notNull().default(0),

  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),

  // Resend broadcast reference (when we use their broadcast API)
  resendBroadcastId: text("resend_broadcast_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── email_sends ────────────────────────────────────────────────────────────────

export const emailSends = pgTable("email_sends", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => emailCampaigns.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),

  // Snapshot at send time — survives contact record changes
  email: text("email").notNull(),

  status: sendStatus("status").notNull().default("queued"),

  // Resend message ID for webhook correlation
  resendMessageId: text("resend_message_id").unique(),

  sentAt: timestamp("sent_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  bouncedAt: timestamp("bounced_at", { withTimezone: true }),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const emailCampaignsRelations = relations(emailCampaigns, ({ many }) => ({
  sends: many(emailSends),
}));

export const emailSendsRelations = relations(emailSends, ({ one }) => ({
  campaign: one(emailCampaigns, {
    fields: [emailSends.campaignId],
    references: [emailCampaigns.id],
  }),
  contact: one(contacts, {
    fields: [emailSends.contactId],
    references: [contacts.id],
  }),
}));

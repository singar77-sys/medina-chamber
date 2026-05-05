/**
 * engagement_events — raw event log powering the member ROI dashboard
 * sync_log          — GrowthZone API sync run history
 *
 * engagement_events feeds:
 *   - The "your membership this month" digest sent to each member
 *   - The per-member engagement score used by churn prediction
 *   - The admin dashboard's real-time member health view
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
import { organizations, contacts } from "./organizations";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const engagementEventType = pgEnum("engagement_event_type", [
  // Member-facing value signals (drives the ROI dashboard)
  "directory_view",     // visitor viewed this org's directory listing
  "referral_click",     // visitor clicked through to the org's website
  "hot_deal_view",      // visitor viewed this org's hot deal
  "chamberbot_mention", // ChamberBot recommended this org in a chat

  // Member participation signals
  "event_attended",     // org contact checked in at a chamber event
  "event_registered",   // org contact registered for an event

  // Email engagement signals
  "email_opened",       // org contact opened a campaign email
  "email_clicked",      // org contact clicked a link in a campaign email

  // Portal activity signals
  "portal_login",       // contact logged into member portal
  "profile_updated",    // org updated their own profile/listing

  // Billing signals
  "renewal_completed",  // org completed a membership renewal
  "payment_failed",     // payment attempt failed

  // Churn risk signal
  "membership_lapsed",  // membership expired without renewal
]);

// ── engagement_events ──────────────────────────────────────────────────────────

export const engagementEvents = pgTable("engagement_events", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Who this event belongs to (both can be null for anonymous directory views)
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),

  eventType: engagementEventType("event_type").notNull(),

  // Flexible metadata — varies by event type
  // directory_view:     { page: "/membership/directory", referrer: "google" }
  // referral_click:     { destination: "https://acme.com", source: "directory" }
  // chamberbot_mention: { query: "plumber", sessionId: "abc" }
  // event_attended:     { eventId: "uuid", eventTitle: "Business Brew" }
  // email_opened:       { campaignId: "uuid", campaignName: "May Newsletter" }
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── sync_log ───────────────────────────────────────────────────────────────────

export const syncLog = pgTable("sync_log", {
  id: uuid("id").primaryKey().defaultRandom(),

  source: text("source").notNull().default("growthzone"),

  // Counts from this run
  added: integer("added").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  removed: integer("removed").notNull().default(0),
  errors: integer("errors").notNull().default(0),

  durationMs: integer("duration_ms"),

  // Any errors encountered during sync (non-fatal)
  errorDetails: jsonb("error_details").$type<Array<{ id: string; error: string }>>(),

  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const engagementEventsRelations = relations(engagementEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [engagementEvents.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [engagementEvents.contactId],
    references: [contacts.id],
  }),
}));

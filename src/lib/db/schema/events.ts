/**
 * events              — chamber events (published calendar)
 * event_tickets       — ticket types per event (member rate, non-member, sponsor table)
 * event_registrations — who registered, payment state, check-in
 */

import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations } from "./organizations";
import { contacts } from "./organizations";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
  "completed",
]);

export const registrationStatus = pgEnum("registration_status", [
  "pending",
  "confirmed",
  "waitlisted",
  "cancelled",
  "attended",
]);

// ── events ─────────────────────────────────────────────────────────────────────

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),

  slug: text("slug").unique().notNull(),
  gzId: text("gz_id").unique(), // GrowthZone event ID for sync

  title: text("title").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),

  status: eventStatus("status").notNull().default("draft"),
  isMembersOnly: boolean("is_members_only").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),

  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),

  location: text("location"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  virtualUrl: text("virtual_url"), // Zoom link, etc.

  maxCapacity: integer("max_capacity"),
  registrationCount: integer("registration_count").notNull().default(0),
  waitlistCount: integer("waitlist_count").notNull().default(0),

  featuredImageUrl: text("featured_image_url"),

  // When null → link to external registration (GrowthZone during transition)
  // When set → we own registration via Stripe
  stripeProductId: text("stripe_product_id"),
  registrationOpenAt: timestamp("registration_open_at", { withTimezone: true }),
  registrationCloseAt: timestamp("registration_close_at", { withTimezone: true }),
  externalRegistrationUrl: text("external_registration_url"),

  // Sponsor/exhibitor info
  sponsorPackagesUrl: text("sponsor_packages_url"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── event_tickets ──────────────────────────────────────────────────────────────

export const eventTickets = pgTable("event_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),

  name: text("name").notNull(),        // "Member Rate", "Non-Member", "Sponsor Table of 8"
  description: text("description"),
  priceCents: integer("price_cents").notNull().default(0), // 0 = free

  stripePriceId: text("stripe_price_id"),

  maxQuantity: integer("max_quantity"),   // null = unlimited
  soldCount: integer("sold_count").notNull().default(0),

  isMemberOnly: boolean("is_member_only").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── event_registrations ────────────────────────────────────────────────────────

export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id),
  ticketId: uuid("ticket_id").references(() => eventTickets.id),

  // Member registration (has a portal account)
  contactId: uuid("contact_id").references(() => contacts.id),
  organizationId: uuid("organization_id").references(() => organizations.id),

  // Guest / non-member fallback
  guestName: text("guest_name"),
  guestEmail: text("guest_email"),

  status: registrationStatus("status").notNull().default("pending"),
  quantity: integer("quantity").notNull().default(1),

  amountCents: integer("amount_cents").notNull().default(0),
  stripePaymentIntentId: text("stripe_payment_intent_id"),

  // GrowthZone import idempotency key
  gzId: text("gz_id").unique(),

  checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const eventsRelations = relations(events, ({ many }) => ({
  tickets: many(eventTickets),
  registrations: many(eventRegistrations),
}));

export const eventTicketsRelations = relations(eventTickets, ({ one, many }) => ({
  event: one(events, {
    fields: [eventTickets.eventId],
    references: [events.id],
  }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  ticket: one(eventTickets, {
    fields: [eventRegistrations.ticketId],
    references: [eventTickets.id],
  }),
  contact: one(contacts, {
    fields: [eventRegistrations.contactId],
    references: [contacts.id],
  }),
  organization: one(organizations, {
    fields: [eventRegistrations.organizationId],
    references: [organizations.id],
  }),
}));

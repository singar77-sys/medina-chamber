/**
 * committees       — standing committees and ad-hoc working groups
 * committee_members — org/contact participation + role
 *
 * Replaces GrowthZone's committee/group module.
 * Feeds the member portal "Your Involvement" view and the
 * staff CRM's committee roster exports.
 */

import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, contacts } from "./organizations";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const committeeMemberRole = pgEnum("committee_member_role", [
  "member",
  "chair",
  "vice_chair",
  "secretary",
  "liaison",
]);

// ── committees ─────────────────────────────────────────────────────────────────

export const committees = pgTable("committees", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),

  // Human-readable meeting cadence shown in the member portal.
  // e.g. "First Tuesday of each month, 8:00am"
  meetingSchedule: text("meeting_schedule"),

  isPublic: boolean("is_public").notNull().default(true),  // shown on public site
  isActive: boolean("is_active").notNull().default(true),

  // Clerk user ID of the chamber staff member who owns this committee
  staffLeadId: text("staff_lead_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── committee_members ──────────────────────────────────────────────────────────

export const committeeMembers = pgTable("committee_members", {
  id: uuid("id").primaryKey().defaultRandom(),

  committeeId: uuid("committee_id")
    .notNull()
    .references(() => committees.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // The specific contact representing the org on this committee.
  // Null if we only know the org, not the individual.
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),

  role: committeeMemberRole("role").notNull().default("member"),

  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  // Null = currently active
  leftAt: timestamp("left_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const committeesRelations = relations(committees, ({ many }) => ({
  members: many(committeeMembers),
}));

export const committeeMembersRelations = relations(committeeMembers, ({ one }) => ({
  committee: one(committees, {
    fields: [committeeMembers.committeeId],
    references: [committees.id],
  }),
  organization: one(organizations, {
    fields: [committeeMembers.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [committeeMembers.contactId],
    references: [contacts.id],
  }),
}));

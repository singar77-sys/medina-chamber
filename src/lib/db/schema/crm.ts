/**
 * notes             — staff CRM activity timeline per org/contact
 * tasks             — manual staff to-dos tied to orgs/contacts
 * tags              — operational labels for flexible segmentation
 * organization_tags — junction: org ↔ tag with attribution
 *
 * notes + tasks replace GrowthZone's "communication history" and "tasks" modules.
 * tags are separate from the GrowthZone-synced `categories` taxonomy — they are
 * staff-applied operational labels ("at-risk", "vip", "hot-prospect") that don't
 * get overwritten by the nightly sync.
 */

import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, contacts } from "./organizations";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const taskStatus = pgEnum("task_status", [
  "open",
  "in_progress",
  "done",
  "cancelled",
]);

export const taskPriority = pgEnum("task_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

// ── notes ──────────────────────────────────────────────────────────────────────

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Either organizationId or contactId must be set (enforced at app layer)
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "cascade",
  }),

  body: text("body").notNull(),

  // Clerk user ID + name snapshot. Name is snapshotted so the note stays
  // readable even if the staff member's Clerk profile changes.
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),

  // Pinned notes surface at the top of the CRM timeline
  isPinned: boolean("is_pinned").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── tasks ──────────────────────────────────────────────────────────────────────

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Tasks can be tied to an org, a contact, or both
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),

  title: text("title").notNull(),
  description: text("description"),

  status: taskStatus("status").notNull().default("open"),
  priority: taskPriority("priority").notNull().default("normal"),

  // Clerk user IDs
  assignedToId: text("assigned_to_id"),   // null = unassigned
  createdById: text("created_by_id").notNull(),

  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── tags ───────────────────────────────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),

  // Hex color for badge rendering in the admin UI
  color: text("color").notNull().default("#6b7280"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── organization_tags ──────────────────────────────────────────────────────────

export const organizationTags = pgTable(
  "organization_tags",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),

    // Who applied this tag and when
    appliedById: text("applied_by_id"), // Clerk user ID; null = system-applied
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.tagId] })],
);

// ── Relations ──────────────────────────────────────────────────────────────────

export const notesRelations = relations(notes, ({ one }) => ({
  organization: one(organizations, {
    fields: [notes.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [tasks.contactId],
    references: [contacts.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  organizationTags: many(organizationTags),
}));

export const organizationTagsRelations = relations(organizationTags, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationTags.organizationId],
    references: [organizations.id],
  }),
  tag: one(tags, {
    fields: [organizationTags.tagId],
    references: [tags.id],
  }),
}));

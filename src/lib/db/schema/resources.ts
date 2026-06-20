/**
 * resources — staff-curated resource library (links to programs, guides, documents).
 *
 * Link-based: each resource points at a URL (an external program, a hosted doc,
 * etc.). Grouped by free-text category on the public/portal pages. member-only
 * resources are hidden from the public page and shown in the member portal.
 */

import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),

  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  url: text("url").notNull(),
  linkLabel: text("link_label"), // CTA text, e.g. "Download PDF" / "Visit site"

  isMemberOnly: boolean("is_member_only").notNull().default(false),
  isPublished: boolean("is_published").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0), // manual order within a category

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * organizations — the member businesses
 * contacts     — people at those businesses
 * categories   — business categories (synced from GrowthZone)
 * organization_categories — junction
 */

import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────────────────

export const organizationStatus = pgEnum("organization_status", [
  "prospect",
  "active",
  "courtesy",
  "non_member",
  "inactive",
  "deleted",
]);

// ── organizations ──────────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // GrowthZone sync
  gzId: text("gz_id").unique(),
  gzSyncedAt: timestamp("gz_synced_at", { withTimezone: true }),

  // Identity
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  status: organizationStatus("status").notNull().default("prospect"),

  // Contact info
  phone: text("phone"),
  email: text("email"),
  websiteUrl: text("website_url"),

  // Address
  address1: text("address1"),
  address2: text("address2"),
  city: text("city").default("Medina"),
  state: text("state").default("OH"),
  zip: text("zip"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),

  // Profile
  description: text("description"),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),

  // Social links
  facebook: text("facebook"),
  twitter: text("twitter"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  youtube: text("youtube"),

  // Membership tier (denormalized for fast directory queries)
  membershipTier: text("membership_tier"), // "silver" | "gold" | "visibility_plus"

  // Stripe
  stripeCustomerId: text("stripe_customer_id").unique(),

  // Soft delete
  deletedAt: timestamp("deleted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── contacts ───────────────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),

  // GrowthZone sync
  gzId: text("gz_id").unique(),
  gzSyncedAt: timestamp("gz_synced_at", { withTimezone: true }),

  // Identity
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  title: text("title"),

  isPrimaryContact: boolean("is_primary_contact").notNull().default(false),

  // Set when this contact claims their member portal account
  clerkUserId: text("clerk_user_id").unique(),
  portalClaimedAt: timestamp("portal_claimed_at", { withTimezone: true }),

  // Email health
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  bounceCount: integer("bounce_count").notNull().default(0),
  lastBouncedAt: timestamp("last_bounced_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── categories ─────────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  gzId: text("gz_id").unique(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  parentId: uuid("parent_id"), // self-reference — filled in after table create
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── organization_categories ────────────────────────────────────────────────────

export const organizationCategories = pgTable(
  "organization_categories",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.categoryId] })],
);

// ── Relations ──────────────────────────────────────────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  contacts: many(contacts),
  organizationCategories: many(organizationCategories),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  organizationCategories: many(organizationCategories),
}));

export const organizationCategoriesRelations = relations(
  organizationCategories,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationCategories.organizationId],
      references: [organizations.id],
    }),
    category: one(categories, {
      fields: [organizationCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

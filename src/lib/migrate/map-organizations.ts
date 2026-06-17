/**
 * GrowthZone → Postgres mapper for ORGANIZATIONS (member businesses).
 *
 * Source: "Contacts Report.xlsx" (979 org rows). Each row is one organization.
 * Target: the `organizations` table (src/lib/db/schema/organizations.ts).
 *
 * Pure: no DB access, no I/O. mapOrganizationRow() takes a single header-keyed
 * row object (as produced by load.ts loadRows()) and returns a plain insert
 * object plus a couple of carry-through fields the orchestrator needs.
 *
 * Header → column mapping (real headers verified against the .xlsx):
 *   Contact Name            → name
 *   ContactId               → gzId (the org's GrowthZone id; the unique join key)
 *   Default Email           → email
 *   Default Phone           → phone
 *   Default Website         → websiteUrl
 *   Default Address 1       → address1
 *   Default City            → city
 *   Default State Province  → state
 *   Default Postal          → zip
 *   Contact Membership Status → status (mapped to organization_status enum)
 *   All Business Categories → categories (string[]; resolved later by orchestrator)
 *   Account Number          → IGNORED (filled 1/979, essentially always blank)
 */

import { cleanStr } from "./coerce";

/** A header-keyed spreadsheet row (matches load.ts `Row`). */
export type GzRow = Record<string, unknown>;

/** The organization_status enum values declared in the schema. */
export type OrganizationStatus =
  | "prospect"
  | "active"
  | "courtesy"
  | "non_member"
  | "inactive"
  | "deleted";

/**
 * Output of the mapper.
 *
 * Fields that exist on the `organizations` table use the schema's camelCase
 * property keys (organizations.$inferInsert shape). `gzId` IS a real column,
 * so the numeric ContactId lands there directly (idempotent re-import works).
 *
 * `categories` and `gzStatus` are NOT organizations columns — they are
 * carry-through fields for a later orchestration step:
 *   - categories: resolved against the categories table + organization_categories
 *     junction (the orchestrator strips these before inserting the org).
 *   - gzStatus: the raw GrowthZone status string, preserved so a re-classification
 *     pass can revisit the enum mapping without re-reading the source file.
 */
export interface MappedOrganization {
  // ── organizations columns ──
  gzId: string;
  name: string;
  status: OrganizationStatus;
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  // ── carry-through (NOT organizations columns) ──
  categories: string[];
  /** Raw "Contact Membership Status" cell, preserved for re-classification. */
  gzStatus: string | null;
}

/**
 * Map a GrowthZone "Contact Membership Status" to the organization_status enum.
 *
 * Observed source values (979 rows): "Active" (518), "Non Member" (258),
 * "Dropped" (200), "Pending Approval" (1). (Two more — "Count\Average\Totals"
 * and "Generated ... by ...") are footer junk dropped by load.ts stripFooterRows.)
 *
 *   Active           → active
 *   Dropped          → inactive   (was a member, no longer paying)
 *   Non Member       → non_member
 *   Pending Approval → prospect   (in the pipeline, not yet a member)
 *
 * Anything unrecognized (or blank) falls back to the schema default 'prospect'
 * so an unexpected future status never throws or silently mis-files as a member.
 */
export function mapStatus(raw: unknown): OrganizationStatus {
  const s = cleanStr(raw);
  if (s === null) return "prospect";
  switch (s.toLowerCase()) {
    case "active":
      return "active";
    case "dropped":
      return "inactive";
    case "non member":
      return "non_member";
    case "pending approval":
      return "prospect";
    default:
      return "prospect";
  }
}

/**
 * Parse the "All Business Categories" cell into a deduped list of category names.
 *
 * IMPORTANT data-quality note (see schemaGaps): GrowthZone joins multiple
 * categories with a COMMA, but it does NOT escape commas that occur *inside* a
 * single category name (e.g. "Contractor, General"). Semicolons, by contrast,
 * only ever appear *inside* names ("Manufacturing; Production & Wholesale",
 * "Family; Community & Civic Organizations") — verified: every semicolon-only
 * cell is a single valid category. So we split on COMMA ONLY and explicitly do
 * NOT split on semicolons (doing so would shatter those 3 valid names for no
 * gain). The unavoidable cost is that comma-containing names get over-split;
 * the orchestrator must reconcile the resulting fragments against the canonical
 * category list when resolving to the categories table.
 */
export function parseCategories(raw: unknown): string[] {
  const s = cleanStr(raw);
  if (s === null) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of s.split(",")) {
    const name = part.trim();
    if (name === "") continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Map a single GrowthZone Contacts-Report row to an organization insert object,
 * or return null if the row is not a real organization record.
 *
 * Every real organization has a numeric ContactId (the GrowthZone join key).
 * Rows with a blank or non-numeric ContactId are footer/junk rows that
 * stripFooterRows() should have removed, but we guard here defensively so a
 * missed footer never becomes a garbage DB record (e.g. an org named "977"
 * with gzId="").
 *
 * `name` is required by the schema (text notNull); a row with no Contact Name
 * falls back to the literal "(unknown)" rather than emitting null and blowing
 * up the insert — such rows are rare (1/979) and flagged for human review via
 * gzStatus + gzId.
 */
export function mapOrganizationRow(row: GzRow): MappedOrganization | null {
  const gzIdRaw = cleanStr(row["ContactId"]);

  // Guard: every real org has a non-empty all-digits ContactId.
  if (gzIdRaw === null || !/^\d+$/.test(gzIdRaw)) return null;

  const name = cleanStr(row["Contact Name"]) ?? "(unknown)";

  return {
    gzId: gzIdRaw,
    name,
    status: mapStatus(row["Contact Membership Status"]),
    email: cleanStr(row["Default Email"]),
    phone: cleanStr(row["Default Phone"]),
    websiteUrl: cleanStr(row["Default Website"]),
    address1: cleanStr(row["Default Address 1"]),
    city: cleanStr(row["Default City"]),
    state: cleanStr(row["Default State Province"]),
    zip: cleanStr(row["Default Postal"]),
    categories: parseCategories(row["All Business Categories"]),
    gzStatus: cleanStr(row["Contact Membership Status"]),
  };
}

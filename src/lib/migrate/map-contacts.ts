/**
 * GrowthZone → Postgres mapper for Contacts (people).
 *
 * Source: "Contacts Report (1).xlsx" (one row per person, 2294 data rows).
 * Target: the `contacts` table in src/lib/db/schema/organizations.ts.
 *
 * Pure: takes a header-keyed spreadsheet row and returns a plain object whose
 * keys are the camelCase TS property names of `contacts.$inferInsert`, plus two
 * GrowthZone join keys (gzContactId, gzOrgId) that the contacts table has no
 * dedicated columns for. The orchestrator resolves gzOrgId → organizationId and
 * uses gzContactId (== gz_id) for idempotent upsert.
 *
 * No DB access, no I/O — see ./coerce for the shared coercion helpers and
 * ./load for the Row type and footer-stripping used by the file reader.
 */
import { cleanStr } from "./coerce";
import type { Row } from "./load";

/**
 * The shape this mapper emits. Field names match `contacts.$inferInsert`
 * (firstName, lastName, email, phone, title, gzId) with two additions:
 *
 *  - gzContactId: the numeric GrowthZone ContactId, stringified. This is ALSO
 *    written to `gzId` (the contacts table's real idempotency column), so the
 *    extra field is purely for a clearly-named, self-documenting handle.
 *  - gzOrgId: the GrowthZone id of the parent organization (Primary Business
 *    Id), stringified, or null for unaffiliated individuals. The contacts table
 *    has NO column for this — organizationId is a uuid FK the orchestrator must
 *    resolve from gzOrgId against organizations.gzId. See schemaGaps.
 *
 * organizationId / isPrimaryContact are intentionally NOT set here: the former
 * is resolved downstream from gzOrgId; the latter has no source signal in this
 * export (Contact Relationship Type is empty for every row) so it falls to its
 * schema default (false).
 */
export interface MappedContact {
  /** contacts.firstName (notNull). "" when the source first name is blank. */
  firstName: string;
  /** contacts.lastName (notNull). "" when the source last name is blank. */
  lastName: string;
  /** contacts.email — unique, nullable. */
  email: string | null;
  /** contacts.phone — nullable. */
  phone: string | null;
  /** contacts.title — nullable. */
  title: string | null;
  /** contacts.gzId — the idempotency key (== gzContactId). null only on a
   *  footer/keyless row that slipped past stripFooterRows. */
  gzId: string | null;
  /** Self-documenting alias of gzId: the numeric GrowthZone ContactId, as text. */
  gzContactId: string | null;
  /** GrowthZone id of the parent org (Primary Business Id), as text, or null
   *  when the person is unaffiliated. Resolved to organizationId downstream. */
  gzOrgId: string | null;
}

/**
 * Stringify a GrowthZone numeric id cell to its text key.
 *
 * The .xlsx stores ContactId / Primary Business Id as JS numbers (e.g.
 * 22966185), so String() is exact for these integer ids (well under
 * Number.MAX_SAFE_INTEGER). Blank cells → null. Trims stray whitespace from the
 * rare string-typed cell.
 */
function idToText(value: unknown): string | null {
  return cleanStr(value);
}

/**
 * Map one GrowthZone contact row to a contacts insert object.
 *
 * firstName/lastName are notNull in the schema; GrowthZone leaves them blank for
 * ~20 rows (id-only / email-only stubs), so we coerce blanks to "" rather than
 * null to keep the row insertable. The orchestrator may choose to backfill from
 * "Contact Name" or skip such stubs.
 */
export function mapContact(row: Row): MappedContact {
  const gzContactId = idToText(row["ContactId"]);

  return {
    firstName: cleanStr(row["Contact First Name"]) ?? "",
    lastName: cleanStr(row["Contact Last Name"]) ?? "",
    email: cleanStr(row["Default Email"]),
    phone: cleanStr(row["Default Phone"]),
    title: cleanStr(row["Contact Title"]),
    gzId: gzContactId,
    gzContactId,
    gzOrgId: idToText(row["Primary Business Id"]),
  };
}

/** Map an array of GrowthZone contact rows. */
export function mapContacts(rows: Row[]): MappedContact[] {
  return rows.map(mapContact);
}

/**
 * GrowthZone "Membership Report" → Postgres mapper.
 *
 * Two pure exports:
 *  - deriveTiers(rows): collapse the 8 GrowthZone membership names into unique
 *    `membership_tiers` insert objects, pricing each tier at the most common
 *    (modal) non-blank Scheduled Billing Amount seen for it, else 0.
 *  - mapMembership(row): map one report row into a `memberships` insert object.
 *
 * Source headers (real, from the .xlsx):
 *   Contact Name, ContactId, Account Number, Default Email, Default Phone,
 *   Membership, Level, Membership Start Date, Membership Activation Type,
 *   Membership Status, Renewal Month, Membership Expiration Date,
 *   Scheduled Billing Amount, Frequency
 *
 * Money is always integer cents (parseCents). Dates are Excel serials
 * converted via excelDateToISO. The numeric ContactId is the GrowthZone join
 * key (the ORG key, not a per-membership key).
 */
import type { memberships, membershipTiers } from "@/lib/db/schema/memberships";
import { excelDateToISO, parseCents } from "./coerce";
import type { Row } from "./load";

type MembershipTierInsert = typeof membershipTiers.$inferInsert;
type MembershipInsert = typeof memberships.$inferInsert;

/**
 * A `memberships` insert plus the GrowthZone ContactId and the source-row
 * signals the orchestrator needs to dedupe.
 *
 * `memberships` has a unique `gzId` column but the GrowthZone ContactId is the
 * ORG id and is NOT unique per membership row (a few orgs carry 2 rows). We
 * therefore expose `gzContactId` (always the org id) and the raw status /
 * expiration so the orchestrator can pick a single winning row per org
 * (keep Active else the latest Membership Expiration Date) BEFORE assigning
 * the unique `memberships.gzId`. We pre-fill `gzId` with the same ContactId as
 * a convenience, but the orchestrator owns final uniqueness.
 */
export interface MappedMembership {
  membership: MembershipInsert;
  /** GrowthZone numeric ContactId (the org key), as a string. */
  gzContactId: string;
  /** kebab-case slug of the GrowthZone Membership name, for tier FK resolution. */
  tierSlug: string;
  /** Raw GrowthZone status string, for dedupe (Active wins). */
  gzStatus: string;
  /** Excel serial expiration date, for dedupe tie-break (latest wins). */
  gzExpirationSerial: unknown;
}

// ── column constants (exact GrowthZone headers) ─────────────────────────────
const COL_CONTACT_ID = "ContactId";
const COL_MEMBERSHIP = "Membership";
const COL_START = "Membership Start Date";
const COL_EXPIRATION = "Membership Expiration Date";
const COL_STATUS = "Membership Status";
const COL_BILLING = "Scheduled Billing Amount";
const COL_FREQUENCY = "Frequency";

/** Stable display order for the known GrowthZone tiers. */
const TIER_SORT_ORDER: Record<string, number> = {
  "Basic": 0,
  "Business Essentials": 1,
  "Visibility Plus": 2,
  "Community Investor": 3,
  "Executive": 4,
  "President": 5,
  "Insurance only": 6,
  "Courtesy": 7,
};

/** kebab-case a tier name: lowercase, non-alphanumerics → single hyphen. */
export function slugifyTier(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Map a GrowthZone Membership Status to the membership_status enum.
 *  Active           → active
 *  Dropped          → cancelled   (chosen over 'lapsed': GrowthZone "Dropped"
 *                                   is an explicit end-of-membership, which
 *                                   maps to a cancellation rather than a
 *                                   lapse-by-nonpayment. Flagged in notes.)
 *  Pending Approval → pending
 *  anything else / blank → pending (safe default; never silently drop)
 */
export function mapMembershipStatus(
  raw: unknown,
): MembershipInsert["status"] {
  const s = String(raw ?? "").trim().toLowerCase();
  switch (s) {
    case "active":
      return "active";
    case "dropped":
      return "cancelled";
    case "pending approval":
      return "pending";
    default:
      return "pending";
  }
}

/** Map a GrowthZone Frequency to the billing_cycle enum. */
export function mapBillingCycle(raw: unknown): MembershipInsert["billingCycle"] {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "monthly" ? "monthly" : "annual";
}

/**
 * Derive the unique `membership_tiers` inserts from all report rows.
 *
 * Pricing: the annual price is the MOST COMMON non-blank Scheduled Billing
 * Amount observed for that tier (in cents), else 0. Blank billing amounts are
 * ignored for the mode — a tier where every row is blank prices at 0.
 * Ties on count are broken by the higher amount (deterministic).
 *
 * Pure: reads only the passed rows; emits one insert per distinct tier name.
 */
export function deriveTiers(rows: Row[]): MembershipTierInsert[] {
  // tier name -> (cents -> occurrence count)
  const priceCounts = new Map<string, Map<number, number>>();

  for (const row of rows) {
    const name = String(row[COL_MEMBERSHIP] ?? "").trim();
    if (name === "") continue;

    if (!priceCounts.has(name)) priceCounts.set(name, new Map());

    const cents = parseCents(row[COL_BILLING]);
    if (cents === null) continue; // blank / non-numeric → not a price signal
    const counts = priceCounts.get(name)!;
    counts.set(cents, (counts.get(cents) ?? 0) + 1);
  }

  const tiers: MembershipTierInsert[] = [];
  for (const [name, counts] of priceCounts) {
    let modalCents = 0;
    let bestCount = 0;
    for (const [cents, count] of counts) {
      if (count > bestCount || (count === bestCount && cents > modalCents)) {
        bestCount = count;
        modalCents = cents;
      }
    }

    tiers.push({
      name,
      slug: slugifyTier(name),
      annualPriceCents: modalCents,
      sortOrder: TIER_SORT_ORDER[name] ?? 99,
      isActive: true,
    });
  }

  // Deterministic output order by sortOrder then name.
  tiers.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return tiers;
}

/**
 * Map one GrowthZone membership-report row to a `memberships` insert (wrapped
 * with the dedupe signals the orchestrator needs).
 *
 * NOTE: organizationId and tierId are FK uuids resolved by the orchestrator
 * (via gzContactId → organizations.gzId and tierSlug → membership_tiers.slug);
 * they are intentionally left out of the emitted insert here. Per the schema
 * both are notNull, so the orchestrator MUST fill them before insert.
 *
 * Per spec, per-member dues are NOT stored on memberships (no amount column);
 * dues live as invoices and feed only tier-price derivation here.
 */
export function mapMembership(row: Row): MappedMembership {
  const gzContactId = String(row[COL_CONTACT_ID] ?? "").trim();
  const tierName = String(row[COL_MEMBERSHIP] ?? "").trim();
  const tierSlug = slugifyTier(tierName);
  const gzStatus = String(row[COL_STATUS] ?? "").trim();

  const startDate = excelDateToISO(row[COL_START]);
  const renewalDate = excelDateToISO(row[COL_EXPIRATION]);

  const membership: MembershipInsert = {
    // FKs filled by orchestrator — see note above.
    organizationId: undefined as unknown as string,
    tierId: undefined as unknown as string,
    status: mapMembershipStatus(gzStatus),
    billingCycle: mapBillingCycle(row[COL_FREQUENCY]),
    // schema requires notNull dates; emit "" when GZ left them blank so the
    // type stays `string` and the gap is loud at insert time rather than null.
    startDate: startDate ?? "",
    renewalDate: renewalDate ?? "",
    // Convenience pre-fill; orchestrator owns final uniqueness (see interface).
    gzId: gzContactId || null,
  };

  return {
    membership,
    gzContactId,
    tierSlug,
    gzStatus,
    gzExpirationSerial: row[COL_EXPIRATION],
  };
}

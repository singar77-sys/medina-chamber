/**
 * GrowthZone → Postgres import ORCHESTRATOR.
 *
 * Two layers, cleanly separated so the heart of the logic is unit-testable
 * with zero database:
 *
 *  1. PURE helpers (no DB, no I/O) — the decisions that need tests:
 *       - dedupeMemberships : one membership per org (active wins, else latest)
 *       - assignUniqueSlugs : kebab org names, resolve collisions with -2/-3
 *       - planContacts      : drop unaffiliated, de-dup unique emails
 *       - buildGzIdMap      : generic gzId → uuid resolver from inserted rows
 *
 *  2. runImport(db, filePaths?) — the async DB-apply layer. Reads the five
 *     GrowthZone .xlsx exports, maps them with the existing pure mappers, then
 *     applies every table in strict FK order. Each step is an IDEMPOTENT upsert
 *     (onConflictDoUpdate on the gzId / slug idempotency key) batched in chunks
 *     so re-running the import never duplicates and never violates a unique
 *     constraint. Returns a ReconciliationReport the run-script prints.
 *
 * The pure helpers are exported individually AND used by runImport, so the test
 * suite exercises the exact code paths the live import uses.
 */

import { sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import {
  organizations,
  contacts,
  categories,
  organizationCategories,
  membershipTiers,
  memberships,
  invoices,
  payments,
  events,
  eventRegistrations,
} from "@/lib/db/schema";

import { loadRows, type Row } from "./load";
import { mapOrganizationRow, type MappedOrganization } from "./map-organizations";
import { mapContact, type MappedContact } from "./map-contacts";
import {
  deriveTiers,
  mapMembership,
  type MappedMembership,
} from "./map-memberships";
import {
  mapInvoice,
  mapInvoicePayment,
  type MappedInvoicePayment,
} from "./map-invoices";
import {
  deriveEvents,
  mapRegistration,
  type DerivedEvent,
  type MappedRegistration,
} from "./map-events";

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert batch size. Postgres caps a statement at 65 535 bound parameters; the
 * widest row we insert (organizations) has well under 130 columns, so 500 rows
 * per batch stays an order of magnitude below the limit while keeping round
 * trips low. Mirrors the existing gz-sync chunk size for the junction table.
 */
const BATCH_SIZE = 500;

/** Open-AR reconciliation target: $47,145.00 in integer cents. */
export const AR_TARGET_CENTS = 4_714_500;

/** The five GrowthZone export files the orchestrator reads, by role. */
export interface FilePaths {
  organizations: string;
  contacts: string;
  memberships: string;
  invoices: string;
  events: string;
}

/** Default GrowthZone export locations (Downloads), override-able via runImport. */
export const DEFAULT_FILE_PATHS: FilePaths = {
  organizations: "C:/Users/Mark/Downloads/Contacts Report.xlsx",
  contacts: "C:/Users/Mark/Downloads/Contacts Report (1).xlsx",
  memberships: "C:/Users/Mark/Downloads/Membership Report (1).xlsx",
  invoices: "C:/Users/Mark/Downloads/Membership Invoices.xlsx",
  events: "C:/Users/Mark/Downloads/Event Attendees Report.xlsx",
};

// ─────────────────────────────────────────────────────────────────────────────
// Small generic helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keep ONE row per non-empty conflict key (last occurrence wins, which matches
 * onConflictDoUpdate's "latest data" intent). Rows whose key is null/undefined/""
 * pass through unchanged (a NULL gz_id never conflicts in Postgres). Returns the
 * de-duplicated rows (original order preserved by first appearance of each key,
 * with the last row's data) and the count dropped.
 */
export function dedupeByKey<T>(
  rows: T[],
  key: (r: T) => string | null | undefined,
): { rows: T[]; dropped: number } {
  // Two-pass: first collect the last-seen row for each keyed value, then
  // rebuild the output in insertion order (first appearance of each key).
  const keyedMap = new Map<string, T>(); // key → last-seen row
  const emptyKeyRows: T[] = [];

  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined || k === "") {
      emptyKeyRows.push(r);
    } else {
      keyedMap.set(k, r); // overwrite with later occurrence
    }
  }

  // Rebuild in first-appearance order: iterate rows again, emit once per key.
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined || k === "") continue; // handled below
    if (!seen.has(k)) {
      seen.add(k);
      out.push(keyedMap.get(k)!); // last-seen data, first-seen position
    }
  }
  // Append all empty-key rows unchanged.
  for (const r of emptyKeyRows) out.push(r);

  return { rows: out, dropped: rows.length - out.length };
}

/** Split an array into fixed-size chunks (last chunk may be shorter). */
export function chunk<T>(arr: T[], size: number = BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** kebab-case a name: lowercase, runs of non-alphanumerics → single hyphen. */
export function kebabCase(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a gzId → uuid Map from rows the DB returned (each `{ gzId, id }`).
 *
 * Used after every upsert step to resolve foreign keys: an upsert with
 * `.returning({ gzId, id })` gives back the surrogate uuid for each natural
 * key, and downstream steps look up parents through this map. Rows with a null
 * gzId (shouldn't happen for the keyed tables, but be defensive) are skipped.
 */
export function buildGzIdMap(
  rows: Array<{ gzId: string | null; id: string }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.gzId !== null && r.gzId !== undefined) map.set(r.gzId, r.id);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE helper: dedupeMemberships
// ─────────────────────────────────────────────────────────────────────────────

export interface DedupeMembershipsResult {
  /** One winning membership per gzContactId (the org key). */
  winners: MappedMembership[];
  /** How many duplicate rows were dropped (input − winners). */
  dropped: number;
}

/**
 * Reduce many membership rows to ONE per org (gzContactId).
 *
 * Winner rule (in order):
 *   1. Prefer a row whose GrowthZone status is "Active" (case-insensitive).
 *      If several are active, the latest-by-renewalDate (then by
 *      gzExpirationSerial) active row wins.
 *   2. If none are active, keep the latest by renewalDate, then by
 *      gzExpirationSerial.
 *
 * renewalDate is the mapped ISO 'YYYY-MM-DD' string on `.membership.renewalDate`
 * (lexicographic compare == chronological for ISO dates; "" sorts earliest so a
 * dated row beats a blank-dated one). gzExpirationSerial is the raw Excel serial
 * number, used only to break a renewalDate tie. Deterministic: ties fall back to
 * the earlier-seen row (stable).
 *
 * Pure: does not mutate inputs.
 */
export function dedupeMemberships(
  mapped: MappedMembership[],
): DedupeMembershipsResult {
  const byOrg = new Map<string, MappedMembership[]>();
  for (const m of mapped) {
    const key = m.gzContactId;
    const list = byOrg.get(key);
    if (list) list.push(m);
    else byOrg.set(key, [m]);
  }

  const winners: MappedMembership[] = [];
  for (const list of byOrg.values()) {
    winners.push(pickMembershipWinner(list));
  }

  return { winners, dropped: mapped.length - winners.length };
}

/** True if a GrowthZone status string means "active" (case-insensitive). */
function isActiveStatus(m: MappedMembership): boolean {
  return m.gzStatus.trim().toLowerCase() === "active";
}

/** Excel serial as a comparable number (non-numeric / blank → -Infinity). */
function expirationSerial(m: MappedMembership): number {
  const v = m.gzExpirationSerial;
  if (v === null || v === undefined || v === "") return Number.NEGATIVE_INFINITY;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

/**
 * "Later" comparator: returns true if `a` should beat `b` on recency.
 * renewalDate (ISO string) first, then gzExpirationSerial. Equal → false
 * (keep the incumbent, which preserves stable first-seen order).
 */
function isLater(a: MappedMembership, b: MappedMembership): boolean {
  const ar = a.membership.renewalDate ?? "";
  const br = b.membership.renewalDate ?? "";
  if (ar !== br) return ar > br;
  return expirationSerial(a) > expirationSerial(b);
}

/** Pick the single winning membership from a same-org group. */
function pickMembershipWinner(list: MappedMembership[]): MappedMembership {
  const actives = list.filter(isActiveStatus);
  const pool = actives.length > 0 ? actives : list;

  let best = pool[0];
  for (let i = 1; i < pool.length; i++) {
    if (isLater(pool[i], best)) best = pool[i];
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE helper: assignUniqueSlugs
// ─────────────────────────────────────────────────────────────────────────────

/** An org carrying a guaranteed-unique slug, ready for insert. */
export type OrgWithSlug = MappedOrganization & { slug: string };

/**
 * Assign every org a unique kebab-case slug derived from its name.
 *
 * organizations.slug is UNIQUE NOT NULL, but org NAMES collide (duplicate
 * business names exist in the export). We kebab the name, then resolve
 * collisions deterministically by appending -2, -3, … in input order — the
 * first occurrence keeps the bare slug, the next becomes `<slug>-2`, and so on.
 *
 * A name that kebabs to "" (e.g. punctuation-only / the "(unknown)" fallback,
 * which kebabs to "unknown") falls back to a stable "org" base so the slug is
 * never empty. Suffix collisions with an already-taken slug keep incrementing
 * until a free slug is found.
 *
 * Pure: returns new objects; does not mutate the inputs.
 */
export function assignUniqueSlugs(orgs: MappedOrganization[]): OrgWithSlug[] {
  const used = new Set<string>();
  return orgs.map((org) => {
    const base = kebabCase(org.name) || "org";
    let slug = base;
    let n = 1;
    while (used.has(slug)) {
      n += 1;
      slug = `${base}-${n}`;
    }
    used.add(slug);
    return { ...org, slug };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE helper: planContacts
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanContactsResult {
  /** Contacts that survive (have a gzOrgId; email nulled on later dupes). */
  kept: MappedContact[];
  /** Count dropped for a null gzOrgId (organizationId is notNull). */
  skippedUnaffiliated: number;
  /** Count of contacts whose email was nulled to avoid a unique collision. */
  deDupedEmails: number;
}

/**
 * Plan the contact insert set.
 *
 *  1. Drop contacts with a null gzOrgId — `contacts.organization_id` is NOT
 *     NULL, so an unaffiliated person cannot be inserted. Counted, not silently
 *     lost.
 *  2. De-duplicate by email (contacts.email is UNIQUE): the FIRST contact for a
 *     given non-null email keeps it; every later contact with the same email
 *     has its email set to null (still insertable, just no email). Counted.
 *
 * Email comparison is case-insensitive and trimmed (GrowthZone emails arrive
 * already-cleaned by cleanStr, but two rows differing only in case are the same
 * address to Postgres' citext-free unique index only if normalized — we
 * normalize here to be safe). Contacts with a null email are always kept as-is.
 *
 * Pure: returns new contact objects for any row whose email is nulled; passes
 * other rows through by reference.
 */
export function planContacts(contacts: MappedContact[]): PlanContactsResult {
  let skippedUnaffiliated = 0;
  let deDupedEmails = 0;
  const seenEmails = new Set<string>();
  const kept: MappedContact[] = [];

  for (const c of contacts) {
    if (c.gzOrgId === null) {
      skippedUnaffiliated += 1;
      continue;
    }

    if (c.email === null) {
      kept.push(c);
      continue;
    }

    const norm = c.email.trim().toLowerCase();
    if (seenEmails.has(norm)) {
      deDupedEmails += 1;
      kept.push({ ...c, email: null });
    } else {
      seenEmails.add(norm);
      kept.push(c);
    }
  }

  return { kept, skippedUnaffiliated, deDupedEmails };
}

// ─────────────────────────────────────────────────────────────────────────────
// ReconciliationReport
// ─────────────────────────────────────────────────────────────────────────────

/** Per-table tally: rows fed in, rows upserted, rows skipped (with reasons). */
export interface TableReport {
  input: number;
  upserted: number;
  skipped: number;
  /** reason → count, e.g. { "unresolved org FK": 3 }. */
  reasons: Record<string, number>;
}

export interface ReconciliationReport {
  categories: TableReport;
  organizations: TableReport;
  organizationCategories: TableReport;
  contacts: TableReport;
  membershipTiers: TableReport;
  memberships: TableReport;
  invoices: TableReport;
  payments: TableReport;
  events: TableReport;
  eventRegistrations: TableReport;

  billing: {
    invoiceCount: number;
    totalAmountCents: number;
    openBalanceCents: number;
  };
  /** True iff the imported open AR equals the $47,145.00 target exactly. */
  arReconciles: boolean;

  // Headline cross-cutting counts (also reflected in the per-table reasons).
  skippedUnaffiliatedContacts: number;
  deDupedEmails: number;
  droppedDuplicateMemberships: number;
  /** Per-step count of rows dropped because a required FK could not resolve. */
  unresolvedFkCounts: Record<string, number>;
}

/** Fresh zeroed per-table report. */
function emptyTableReport(input = 0): TableReport {
  return { input, upserted: 0, skipped: 0, reasons: {} };
}

/** Record a skip with its reason on a table report. */
function recordSkip(rep: TableReport, reason: string, n = 1): void {
  rep.skipped += n;
  rep.reasons[reason] = (rep.reasons[reason] ?? 0) + n;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB-APPLY layer: runImport
// ─────────────────────────────────────────────────────────────────────────────

/** updatedAt set on every upsert so re-imports refresh the timestamp. */
function nowUpdate() {
  return { updatedAt: new Date() };
}

/**
 * Apply the full GrowthZone import against `db`, in strict FK order, idempotently.
 *
 * Every write is `insert(...).onConflictDoUpdate({ target, set })` keyed on the
 * table's idempotency column (gzId, except membership_tiers/categories keyed on
 * slug, and organization_categories on its composite PK via onConflictDoNothing).
 * Re-running upserts the same rows rather than duplicating them.
 *
 * Inserts use `.returning({ gzId, id })` (or slug/name for the slug-keyed
 * tables) so each step hands the next step a natural-key → uuid map for FK
 * resolution. Rows whose required FK cannot be resolved are dropped and counted
 * in unresolvedFkCounts (and the per-table report) rather than throwing.
 */
export async function runImport(
  db: DB,
  filePaths: FilePaths = DEFAULT_FILE_PATHS,
  extraOrgRows: Row[] = [],
): Promise<ReconciliationReport> {
  // ── Read + map all sources up front (pure; surfaces file errors early) ──────
  const orgRows = [...loadRows(filePaths.organizations), ...extraOrgRows];
  const contactRows = loadRows(filePaths.contacts);
  const membershipRows = loadRows(filePaths.memberships);
  const invoiceRows = loadRows(filePaths.invoices);
  const registrationRows = loadRows(filePaths.events);

  const mappedOrgs = orgRows
    .map(mapOrganizationRow)
    .filter((o): o is MappedOrganization => o !== null);
  const mappedContacts = contactRows.map(mapContact);
  const mappedMemberships = membershipRows.map(mapMembership);
  const mappedInvoices = invoiceRows.map(mapInvoice);
  const mappedPayments = invoiceRows
    .map(mapInvoicePayment)
    .filter((p): p is MappedInvoicePayment => p !== null);
  const derivedEvents = deriveEvents(registrationRows);
  const mappedRegistrations = registrationRows.map(mapRegistration);

  const report: ReconciliationReport = {
    categories: emptyTableReport(),
    organizations: emptyTableReport(mappedOrgs.length),
    organizationCategories: emptyTableReport(),
    contacts: emptyTableReport(mappedContacts.length),
    membershipTiers: emptyTableReport(),
    memberships: emptyTableReport(mappedMemberships.length),
    invoices: emptyTableReport(mappedInvoices.length),
    payments: emptyTableReport(mappedPayments.length),
    events: emptyTableReport(derivedEvents.length),
    eventRegistrations: emptyTableReport(mappedRegistrations.length),
    billing: { invoiceCount: 0, totalAmountCents: 0, openBalanceCents: 0 },
    arReconciles: false,
    skippedUnaffiliatedContacts: 0,
    deDupedEmails: 0,
    droppedDuplicateMemberships: 0,
    unresolvedFkCounts: {},
  };

  // ── 1. categories (key on slug) ─────────────────────────────────────────────
  // Gather unique category names across all orgs; the source gives names only,
  // so the slug is the idempotency key. name→id map built from a full re-read.
  const catNameToSlug = new Map<string, string>();
  for (const org of mappedOrgs) {
    for (const name of org.categories) {
      if (!catNameToSlug.has(name)) catNameToSlug.set(name, kebabCase(name) || "category");
    }
  }
  // Two distinct names could kebab to the same slug; keep the first deterministically.
  const catBySlug = new Map<string, { name: string; slug: string }>();
  for (const [name, slug] of catNameToSlug) {
    if (!catBySlug.has(slug)) catBySlug.set(slug, { name, slug });
  }
  const catValues = [...catBySlug.values()].map((c) => ({
    name: c.name,
    slug: c.slug,
  }));
  report.categories.input = catValues.length;

  for (const batch of chunk(catValues)) {
    await db
      .insert(categories)
      .values(batch)
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: sql`excluded.name` },
      });
    report.categories.upserted += batch.length;
  }
  // name → id (full read so pre-existing categories resolve too).
  const allCats = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories);
  const catSlugToId = new Map(allCats.map((c) => [c.slug, c.id]));
  const categoryNameToId = new Map<string, string>();
  for (const [name, slug] of catNameToSlug) {
    const id = catSlugToId.get(slug);
    if (id) categoryNameToId.set(name, id);
  }

  // ── 2. organizations (key on gzId) ──────────────────────────────────────────
  const orgsWithSlugs = assignUniqueSlugs(mappedOrgs);
  const orgInsertsRaw = orgsWithSlugs.map((o) => ({
    gzId: o.gzId,
    name: o.name,
    slug: o.slug,
    status: o.status,
    email: o.email,
    phone: o.phone,
    websiteUrl: o.websiteUrl,
    address1: o.address1,
    city: o.city,
    state: o.state,
    zip: o.zip,
    gzSyncedAt: new Date(),
  }));
  const { rows: orgInserts, dropped: orgDupesDrop } = dedupeByKey(
    orgInsertsRaw,
    (r) => r.gzId,
  );
  if (orgDupesDrop > 0) {
    recordSkip(report.organizations, "duplicate gzId in source", orgDupesDrop);
  }

  const orgGzToId = new Map<string, string>();
  for (const batch of chunk(orgInserts)) {
    const returned = await db
      .insert(organizations)
      .values(batch)
      .onConflictDoUpdate({
        target: organizations.gzId,
        set: {
          name: sql`excluded.name`,
          status: sql`excluded.status`,
          email: sql`excluded.email`,
          phone: sql`excluded.phone`,
          websiteUrl: sql`excluded.website_url`,
          address1: sql`excluded.address1`,
          city: sql`excluded.city`,
          state: sql`excluded.state`,
          zip: sql`excluded.zip`,
          gzSyncedAt: sql`excluded.gz_synced_at`,
          ...nowUpdate(),
        },
      })
      .returning({ gzId: organizations.gzId, id: organizations.id });
    for (const [k, v] of buildGzIdMap(returned)) orgGzToId.set(k, v);
    report.organizations.upserted += batch.length;
  }

  // ── 3. organization_categories (composite PK) ───────────────────────────────
  const junctionRows: Array<{ organizationId: string; categoryId: string }> = [];
  for (const org of orgsWithSlugs) {
    const orgId = orgGzToId.get(org.gzId);
    if (!orgId) {
      recordSkip(report.organizationCategories, "unresolved org FK", org.categories.length);
      continue;
    }
    for (const name of org.categories) {
      report.organizationCategories.input += 1;
      const catId = categoryNameToId.get(name);
      if (!catId) {
        recordSkip(report.organizationCategories, "unresolved category FK");
        continue;
      }
      junctionRows.push({ organizationId: orgId, categoryId: catId });
    }
  }
  for (const batch of chunk(junctionRows)) {
    await db.insert(organizationCategories).values(batch).onConflictDoNothing();
    report.organizationCategories.upserted += batch.length;
  }

  // ── 4. contacts (key on gzId) ───────────────────────────────────────────────
  const plan = planContacts(mappedContacts);
  report.skippedUnaffiliatedContacts = plan.skippedUnaffiliated;
  report.deDupedEmails = plan.deDupedEmails;
  recordSkip(report.contacts, "unaffiliated (null org)", plan.skippedUnaffiliated);

  const contactInsertsRaw: Array<typeof contacts.$inferInsert> = [];
  for (const c of plan.kept) {
    const orgId = c.gzOrgId !== null ? orgGzToId.get(c.gzOrgId) : undefined;
    if (!orgId) {
      recordSkip(report.contacts, "unresolved org FK");
      continue;
    }
    contactInsertsRaw.push({
      organizationId: orgId,
      gzId: c.gzId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      title: c.title,
      gzSyncedAt: new Date(),
    });
  }
  report.unresolvedFkCounts["contacts.organizationId"] =
    report.contacts.reasons["unresolved org FK"] ?? 0;

  const { rows: contactInserts, dropped: contactDupesDrop } = dedupeByKey(
    contactInsertsRaw,
    (r) => r.gzId ?? null,
  );
  if (contactDupesDrop > 0) {
    recordSkip(report.contacts, "duplicate gzId in source", contactDupesDrop);
  }

  for (const batch of chunk(contactInserts)) {
    await db
      .insert(contacts)
      .values(batch)
      .onConflictDoUpdate({
        target: contacts.gzId,
        set: {
          organizationId: sql`excluded.organization_id`,
          firstName: sql`excluded.first_name`,
          lastName: sql`excluded.last_name`,
          email: sql`excluded.email`,
          phone: sql`excluded.phone`,
          title: sql`excluded.title`,
          gzSyncedAt: sql`excluded.gz_synced_at`,
          ...nowUpdate(),
        },
      });
    report.contacts.upserted += batch.length;
  }
  // contact gzId → id for event_registrations linking.
  const allContacts = await db
    .select({ id: contacts.id, gzId: contacts.gzId })
    .from(contacts);
  const contactGzToId = buildGzIdMap(allContacts);

  // ── 5. membership_tiers (key on slug) ───────────────────────────────────────
  const tierValuesRaw = deriveTiers(membershipRows);
  const { rows: tierValues, dropped: tierDupesDrop } = dedupeByKey(
    tierValuesRaw,
    (r) => r.slug,
  );
  if (tierDupesDrop > 0) {
    recordSkip(report.membershipTiers, "duplicate slug in source", tierDupesDrop);
  }
  report.membershipTiers.input = tierValues.length;
  for (const batch of chunk(tierValues)) {
    await db
      .insert(membershipTiers)
      .values(batch)
      .onConflictDoUpdate({
        target: membershipTiers.slug,
        set: {
          name: sql`excluded.name`,
          annualPriceCents: sql`excluded.annual_price_cents`,
          sortOrder: sql`excluded.sort_order`,
          isActive: sql`excluded.is_active`,
          ...nowUpdate(),
        },
      });
    report.membershipTiers.upserted += batch.length;
  }
  const allTiers = await db
    .select({ id: membershipTiers.id, slug: membershipTiers.slug })
    .from(membershipTiers);
  const tierSlugToId = new Map(allTiers.map((t) => [t.slug, t.id]));

  // ── 6. memberships (key on gzId; dedupe to one per org) ─────────────────────
  const dedupe = dedupeMemberships(mappedMemberships);
  report.droppedDuplicateMemberships = dedupe.dropped;
  recordSkip(report.memberships, "duplicate org membership", dedupe.dropped);

  const membershipInsertsRaw: Array<typeof memberships.$inferInsert> = [];
  for (const m of dedupe.winners) {
    const orgId = orgGzToId.get(m.gzContactId);
    const tierId = tierSlugToId.get(m.tierSlug);
    if (!orgId) {
      recordSkip(report.memberships, "unresolved org FK");
      continue;
    }
    if (!tierId) {
      recordSkip(report.memberships, "unresolved tier FK");
      continue;
    }
    membershipInsertsRaw.push({
      ...m.membership,
      organizationId: orgId,
      tierId,
    });
  }
  report.unresolvedFkCounts["memberships.organizationId"] =
    report.memberships.reasons["unresolved org FK"] ?? 0;
  report.unresolvedFkCounts["memberships.tierId"] =
    report.memberships.reasons["unresolved tier FK"] ?? 0;

  const { rows: membershipInserts, dropped: membershipDupesDrop } = dedupeByKey(
    membershipInsertsRaw,
    (r) => r.gzId ?? null,
  );
  if (membershipDupesDrop > 0) {
    recordSkip(report.memberships, "duplicate gzId in source", membershipDupesDrop);
  }

  for (const batch of chunk(membershipInserts)) {
    await db
      .insert(memberships)
      .values(batch)
      .onConflictDoUpdate({
        target: memberships.gzId,
        set: {
          organizationId: sql`excluded.organization_id`,
          tierId: sql`excluded.tier_id`,
          status: sql`excluded.status`,
          billingCycle: sql`excluded.billing_cycle`,
          startDate: sql`excluded.start_date`,
          renewalDate: sql`excluded.renewal_date`,
          ...nowUpdate(),
        },
      });
    report.memberships.upserted += batch.length;
  }

  // ── 7. invoices (key on gzId = invoice number) ──────────────────────────────
  const invoiceInsertsRaw: Array<typeof invoices.$inferInsert> = [];
  for (const inv of mappedInvoices) {
    const orgId = inv.gzOrgId !== null ? orgGzToId.get(inv.gzOrgId) : undefined;
    if (!orgId) {
      recordSkip(report.invoices, "unresolved org FK");
      continue;
    }
    invoiceInsertsRaw.push({
      organizationId: orgId,
      gzId: inv.gzId,
      amountCents: inv.amountCents,
      amountPaidCents: inv.amountPaidCents,
      status: inv.status,
      description: inv.description,
      paidAt: inv.paidAt,
    });
  }
  report.unresolvedFkCounts["invoices.organizationId"] =
    report.invoices.reasons["unresolved org FK"] ?? 0;

  const { rows: invoiceInserts, dropped: invoiceDupesDrop } = dedupeByKey(
    invoiceInsertsRaw,
    (r) => r.gzId ?? null,
  );
  if (invoiceDupesDrop > 0) {
    recordSkip(report.invoices, "duplicate gzId in source", invoiceDupesDrop);
  }

  for (const batch of chunk(invoiceInserts)) {
    await db
      .insert(invoices)
      .values(batch)
      .onConflictDoUpdate({
        target: invoices.gzId,
        set: {
          organizationId: sql`excluded.organization_id`,
          amountCents: sql`excluded.amount_cents`,
          amountPaidCents: sql`excluded.amount_paid_cents`,
          status: sql`excluded.status`,
          description: sql`excluded.description`,
          paidAt: sql`excluded.paid_at`,
          ...nowUpdate(),
        },
      });
    report.invoices.upserted += batch.length;
  }
  // invoice gzId (== invoice number) → id, for payment linking.
  const allInvoices = await db
    .select({ id: invoices.id, gzId: invoices.gzId })
    .from(invoices);
  const invoiceGzToId = buildGzIdMap(allInvoices);

  // ── 8. payments (key on gzId; invoiceId notNull) ────────────────────────────
  const paymentInsertsRaw: Array<typeof payments.$inferInsert> = [];
  for (const p of mappedPayments) {
    const orgId = p.gzOrgId !== null ? orgGzToId.get(p.gzOrgId) : undefined;
    const invoiceId =
      p.gzInvoiceNumber !== null ? invoiceGzToId.get(p.gzInvoiceNumber) : undefined;
    if (!orgId) {
      recordSkip(report.payments, "unresolved org FK");
      continue;
    }
    if (!invoiceId) {
      recordSkip(report.payments, "unresolved invoice FK");
      continue;
    }
    paymentInsertsRaw.push({
      organizationId: orgId,
      invoiceId,
      type: p.type,
      method: p.method,
      amountCents: p.amountCents,
      memo: p.memo,
      occurredAt: p.occurredAt,
      gzId: p.gzId,
    });
  }
  report.unresolvedFkCounts["payments.organizationId"] =
    report.payments.reasons["unresolved org FK"] ?? 0;
  report.unresolvedFkCounts["payments.invoiceId"] =
    report.payments.reasons["unresolved invoice FK"] ?? 0;

  const { rows: paymentInserts, dropped: paymentDupesDrop } = dedupeByKey(
    paymentInsertsRaw,
    (r) => r.gzId ?? null,
  );
  if (paymentDupesDrop > 0) {
    recordSkip(report.payments, "duplicate gzId in source", paymentDupesDrop);
  }

  for (const batch of chunk(paymentInserts)) {
    await db
      .insert(payments)
      .values(batch)
      .onConflictDoUpdate({
        target: payments.gzId,
        set: {
          organizationId: sql`excluded.organization_id`,
          invoiceId: sql`excluded.invoice_id`,
          type: sql`excluded.type`,
          method: sql`excluded.method`,
          amountCents: sql`excluded.amount_cents`,
          memo: sql`excluded.memo`,
          occurredAt: sql`excluded.occurred_at`,
          // NB: payments is conceptually append-only; we still upsert on the
          // gzId idempotency key so a re-run refreshes rather than duplicates.
        },
      });
    report.payments.upserted += batch.length;
  }

  // ── 9. events (key on gzId; strip eventKey before insert) ───────────────────
  // Dedupe by gzId BEFORE inserting; eventKeyToId is built only from survivors.
  // Registrations referencing a dropped event's key will get "unresolved event FK".
  const { rows: dedupedEvents, dropped: eventDupesDrop } = dedupeByKey(
    derivedEvents,
    (e) => e.gzId ?? null,
  );
  if (eventDupesDrop > 0) {
    recordSkip(report.events, "duplicate gzId in source", eventDupesDrop);
  }
  const eventInserts = dedupedEvents.map((e) => stripEventKey(e));
  const eventKeyToId = new Map<string, string>();
  for (let i = 0; i < dedupedEvents.length; i += BATCH_SIZE) {
    const slice = dedupedEvents.slice(i, i + BATCH_SIZE);
    const batch = eventInserts.slice(i, i + BATCH_SIZE);
    const returned = await db
      .insert(events)
      .values(batch)
      .onConflictDoUpdate({
        target: events.gzId,
        set: {
          title: sql`excluded.title`,
          slug: sql`excluded.slug`,
          status: sql`excluded.status`,
          startsAt: sql`excluded.starts_at`,
          ...nowUpdate(),
        },
      })
      .returning({ gzId: events.gzId, id: events.id });
    const gzToId = buildGzIdMap(returned);
    // Map eventKey → id by aligning the derived event's gzId with the returned id.
    for (const de of slice) {
      const id = de.gzId ? gzToId.get(de.gzId) : undefined;
      if (id) eventKeyToId.set(de.eventKey, id);
    }
    report.events.upserted += batch.length;
  }

  // ── 10. event_registrations (key on gzId) ───────────────────────────────────
  const regInsertsRaw: Array<typeof eventRegistrations.$inferInsert> = [];
  for (const r of mappedRegistrations) {
    const eventId = eventKeyToId.get(r.eventKey);
    if (!eventId) {
      // events with a blank/unparseable date are skipped by deriveEvents; a
      // registration pointing at one cannot resolve its notNull eventId.
      recordSkip(report.eventRegistrations, "unresolved event FK");
      continue;
    }
    const contactId =
      r.gzContactId !== null ? contactGzToId.get(String(r.gzContactId)) ?? null : null;
    // organizationId on a registration is nullable; resolve via the contact's
    // org is not available here (registration has no org gzId), so leave null.
    regInsertsRaw.push({
      ...stripRegistrationCarry(r),
      eventId,
      contactId,
    });
  }
  report.unresolvedFkCounts["eventRegistrations.eventId"] =
    report.eventRegistrations.reasons["unresolved event FK"] ?? 0;

  const { rows: regInserts, dropped: regDupesDrop } = dedupeByKey(
    regInsertsRaw,
    (r) => r.gzId ?? null,
  );
  if (regDupesDrop > 0) {
    recordSkip(report.eventRegistrations, "duplicate gzId in source", regDupesDrop);
  }

  for (const batch of chunk(regInserts)) {
    await db
      .insert(eventRegistrations)
      .values(batch)
      .onConflictDoUpdate({
        target: eventRegistrations.gzId,
        set: {
          eventId: sql`excluded.event_id`,
          contactId: sql`excluded.contact_id`,
          guestName: sql`excluded.guest_name`,
          guestEmail: sql`excluded.guest_email`,
          status: sql`excluded.status`,
          quantity: sql`excluded.quantity`,
          amountCents: sql`excluded.amount_cents`,
          ...nowUpdate(),
        },
      });
    report.eventRegistrations.upserted += batch.length;
  }

  // ── Billing reconciliation ──────────────────────────────────────────────────
  // Computed from the MAPPED invoices (source of truth for the import), so the
  // check is meaningful even before the rows round-trip through the DB.
  let totalAmountCents = 0;
  let openBalanceCents = 0;
  for (const inv of mappedInvoices) {
    totalAmountCents += inv.amountCents;
    openBalanceCents += inv.amountCents - inv.amountPaidCents;
  }
  report.billing = {
    invoiceCount: mappedInvoices.length,
    totalAmountCents,
    openBalanceCents,
  };
  report.arReconciles = openBalanceCents === AR_TARGET_CENTS;

  return report;
}

// ── insert-shaping helpers (strip carry-through fields) ──────────────────────

/** Drop the orchestration-only `eventKey` from a derived event before insert. */
function stripEventKey(e: DerivedEvent): typeof events.$inferInsert {
  const { eventKey: _eventKey, ...insert } = e;
  void _eventKey;
  return insert;
}

/** Drop orchestration-only fields from a mapped registration before insert. */
function stripRegistrationCarry(
  r: MappedRegistration,
): Omit<typeof eventRegistrations.$inferInsert, "eventId" | "contactId" | "organizationId"> {
  const { eventKey: _eventKey, gzContactId: _gzContactId, ...insert } = r;
  void _eventKey;
  void _gzContactId;
  return insert;
}

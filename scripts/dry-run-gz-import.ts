/**
 * Pure-pipeline dry-run for the GrowthZone → Postgres import.
 *
 * Loads the 5 GZ export files, runs every pure mapper and helper, and prints
 * a reconciliation report — without touching a database. No DATABASE_URL
 * required; this script deliberately does NOT import from @/lib/db or
 * @/lib/db/index.
 *
 * Uses relative imports so tsx resolves them without needing the @/ alias
 * (though tsx does support it via tsconfig paths).
 *
 *   pnpm tsx scripts/dry-run-gz-import.ts
 */

import { loadRows } from "../src/lib/migrate/load";
import {
  mapOrganizationRow,
  type MappedOrganization,
} from "../src/lib/migrate/map-organizations";
import { mapContact } from "../src/lib/migrate/map-contacts";
import {
  deriveTiers,
  mapMembership,
} from "../src/lib/migrate/map-memberships";
import { mapInvoice, mapInvoicePayment } from "../src/lib/migrate/map-invoices";
import { deriveEvents, mapRegistration } from "../src/lib/migrate/map-events";
import {
  assignUniqueSlugs,
  planContacts,
  dedupeMemberships,
  AR_TARGET_CENTS,
  DEFAULT_FILE_PATHS,
} from "../src/lib/migrate/orchestrate";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Format integer cents as "$1,234.56". */
function dollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${frac}`;
}

// ── Load all five source files ────────────────────────────────────────────────

console.log("=== GrowthZone Import Dry-Run (no DB) ===\n");
console.log("Loading source files…");

const orgRows = loadRows(DEFAULT_FILE_PATHS.organizations);
const contactRows = loadRows(DEFAULT_FILE_PATHS.contacts);
const membershipRows = loadRows(DEFAULT_FILE_PATHS.memberships);
const invoiceRows = loadRows(DEFAULT_FILE_PATHS.invoices);
const eventRows = loadRows(DEFAULT_FILE_PATHS.events);

console.log(`  organizations source rows : ${orgRows.length}`);
console.log(`  contacts      source rows : ${contactRows.length}`);
console.log(`  memberships   source rows : ${membershipRows.length}`);
console.log(`  invoices      source rows : ${invoiceRows.length}`);
console.log(`  event regs    source rows : ${eventRows.length}`);
console.log();

// ── Map ───────────────────────────────────────────────────────────────────────

const mappedOrgs = orgRows
  .map(mapOrganizationRow)
  .filter((o): o is MappedOrganization => o !== null);

const mappedContacts = contactRows.map(mapContact);

const mappedMemberships = membershipRows.map(mapMembership);

const mappedInvoices = invoiceRows.map(mapInvoice);

const mappedPayments = invoiceRows
  .map(mapInvoicePayment)
  .filter((p) => p !== null);

const derivedEvents = deriveEvents(eventRows);

const mappedRegistrations = eventRows.map(mapRegistration);

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Organizations: assign unique slugs, count suffix collisions
const orgsWithSlugs = assignUniqueSlugs(mappedOrgs);
let suffixedSlugs = 0;
for (const o of orgsWithSlugs) {
  if (/-\d+$/.test(o.slug)) suffixedSlugs++;
}

// Contacts: plan (drop unaffiliated, dedup emails)
const contactPlan = planContacts(mappedContacts);

// Memberships: dedupe to one per org
const dedupeResult = dedupeMemberships(mappedMemberships);

// Tiers: derive unique tiers
const tiers = deriveTiers(membershipRows);

// ── Billing reconciliation ────────────────────────────────────────────────────

let totalAmountCents = 0;
let openBalanceCents = 0;
for (const inv of mappedInvoices) {
  totalAmountCents += inv.amountCents;
  openBalanceCents += inv.amountCents - inv.amountPaidCents;
}
const arReconciles = openBalanceCents === AR_TARGET_CENTS;

// ── Report ────────────────────────────────────────────────────────────────────

console.log("── Organizations ───────────────────────────────────────");
console.log(`  mapped (non-null)          : ${mappedOrgs.length}`);
console.log(`  slugged (after assignUniqueSlugs) : ${orgsWithSlugs.length}`);
console.log(`  slugs with -N suffix (collisions) : ${suffixedSlugs}`);
console.log();

console.log("── Contacts ────────────────────────────────────────────");
console.log(`  mapped total               : ${mappedContacts.length}`);
console.log(`  kept                       : ${contactPlan.kept.length}`);
console.log(`  skipped unaffiliated       : ${contactPlan.skippedUnaffiliated}`);
console.log(`  de-duped emails (nulled)   : ${contactPlan.deDupedEmails}`);
console.log();

console.log("── Memberships ─────────────────────────────────────────");
console.log(`  mapped total               : ${mappedMemberships.length}`);
console.log(`  winners (one per org)      : ${dedupeResult.winners.length}`);
console.log(`  dropped duplicates         : ${dedupeResult.dropped}`);
console.log();

console.log("── Membership Tiers ────────────────────────────────────");
console.log(`  distinct tiers             : ${tiers.length}`);
for (const t of tiers) {
  console.log(
    `    ${t.name.padEnd(30)} slug=${t.slug}  annualPriceCents=${t.annualPriceCents}`,
  );
}
console.log();

console.log("── Invoices ────────────────────────────────────────────");
console.log(`  mapped count               : ${mappedInvoices.length}`);
console.log(`  total invoiced             : ${dollars(totalAmountCents)}`);
console.log(`  open AR balance            : ${dollars(openBalanceCents)}`);
console.log(`  AR target                  : ${dollars(AR_TARGET_CENTS)}`);
console.log(`  AR reconciles              : ${arReconciles ? "YES ✓" : "NO ✗"} (vs $47,145.00)`);
console.log();

console.log("── Payments ────────────────────────────────────────────");
console.log(`  derived payment rows       : ${mappedPayments.length}`);
console.log();

console.log("── Events ──────────────────────────────────────────────");
console.log(`  distinct events derived    : ${derivedEvents.length}`);
console.log();

console.log("── Event Registrations ─────────────────────────────────");
console.log(`  mapped registration rows   : ${mappedRegistrations.length}`);
console.log();

console.log("=== Dry-run complete (no DB writes) ===");
process.exit(arReconciles ? 0 : 1);

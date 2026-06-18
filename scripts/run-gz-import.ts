/**
 * One-shot runner for the GrowthZone → Postgres import ORCHESTRATOR.
 *
 * Reads the five validated GrowthZone .xlsx exports, applies them to Postgres
 * in strict FK order via runImport(), and prints the ReconciliationReport as a
 * readable table.
 *
 *   pnpm tsx --env-file=.env.local scripts/run-gz-import.ts
 *
 * Optionally override the five file paths positionally (in this exact order):
 *   pnpm tsx --env-file=.env.local scripts/run-gz-import.ts \
 *     "<orgs.xlsx>" "<contacts.xlsx>" "<memberships.xlsx>" \
 *     "<invoices.xlsx>" "<events.xlsx>"
 *
 * Exit codes:
 *   0  success and open AR reconciles to $47,145.00
 *   1  AR did NOT reconcile, OR an unexpected unresolved-FK count was non-zero,
 *      OR the import threw.
 *
 * Requires DATABASE_URL (loaded via --env-file=.env.local, as run-gz-sync does).
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

// The import runs against the SESSION pooler (port 5432): SSL on, prepared
// statements ON. Do NOT set prepare:false here — that is only correct for the
// app's transaction-pooler path (src/lib/db), and on the session pooler it
// breaks Supabase's tenant routing (auth fails as bare "postgres").
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const client = postgres(dbUrl, { ssl: "require", max: 1 });
const db = drizzle(client, { schema });
import {
  runImport,
  DEFAULT_FILE_PATHS,
  AR_TARGET_CENTS,
  type FilePaths,
  type ReconciliationReport,
  type TableReport,
} from "@/lib/migrate/orchestrate";

/** Build the FilePaths from positional argv, falling back to the defaults. */
function resolveFilePaths(argv: string[]): FilePaths {
  const [orgs, contacts, memberships, invoices, events] = argv;
  return {
    organizations: orgs ?? DEFAULT_FILE_PATHS.organizations,
    contacts: contacts ?? DEFAULT_FILE_PATHS.contacts,
    memberships: memberships ?? DEFAULT_FILE_PATHS.memberships,
    invoices: invoices ?? DEFAULT_FILE_PATHS.invoices,
    events: events ?? DEFAULT_FILE_PATHS.events,
  };
}

/** Format integer cents as "$1,234.56". */
function dollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${frac}`;
}

const TABLE_ORDER: Array<keyof ReconciliationReport> = [
  "categories",
  "organizations",
  "organizationCategories",
  "contacts",
  "membershipTiers",
  "memberships",
  "invoices",
  "payments",
  "events",
  "eventRegistrations",
];

function printReport(report: ReconciliationReport): void {
  console.log("\n── Per-table results ───────────────────────────────────────");
  console.log(
    "table".padEnd(24) +
      "input".padStart(8) +
      "upserted".padStart(10) +
      "skipped".padStart(9),
  );
  for (const key of TABLE_ORDER) {
    const t = report[key] as TableReport;
    console.log(
      String(key).padEnd(24) +
        String(t.input).padStart(8) +
        String(t.upserted).padStart(10) +
        String(t.skipped).padStart(9),
    );
    for (const [reason, n] of Object.entries(t.reasons)) {
      if (n > 0) console.log(`    ↳ skipped (${reason}): ${n}`);
    }
  }

  console.log("\n── Cross-cutting counts ────────────────────────────────────");
  console.log(`  unaffiliated contacts skipped : ${report.skippedUnaffiliatedContacts}`);
  console.log(`  de-duped contact emails       : ${report.deDupedEmails}`);
  console.log(`  duplicate memberships dropped : ${report.droppedDuplicateMemberships}`);

  console.log("\n── Unresolved FK counts ────────────────────────────────────");
  const fkEntries = Object.entries(report.unresolvedFkCounts);
  if (fkEntries.length === 0) {
    console.log("  (none recorded)");
  } else {
    for (const [k, n] of fkEntries) {
      console.log(`  ${k.padEnd(34)} ${n}${n > 0 ? "  ⚠" : ""}`);
    }
  }

  console.log("\n── Billing reconciliation ──────────────────────────────────");
  console.log(`  invoices            : ${report.billing.invoiceCount}`);
  console.log(`  total invoiced      : ${dollars(report.billing.totalAmountCents)}`);
  console.log(`  open balance (AR)   : ${dollars(report.billing.openBalanceCents)}`);
  console.log(`  AR target           : ${dollars(AR_TARGET_CENTS)}`);
  console.log(
    `  AR reconciles       : ${report.arReconciles ? "✅ YES" : "❌ NO"}`,
  );
}

void (async () => {
  const filePaths = resolveFilePaths(process.argv.slice(2));

  console.log("🔄  Starting GrowthZone → Postgres import...\n");
  console.log("  Sources:");
  for (const [k, v] of Object.entries(filePaths)) {
    console.log(`    ${k.padEnd(14)} ${v}`);
  }

  let report: ReconciliationReport;
  try {
    report = await runImport(db, filePaths);
  } catch (err) {
    console.error("\n❌  Import failed:");
    console.error(err instanceof Error ? err.message : String(err));
    const cause = (err as { cause?: unknown })?.cause;
    if (cause) console.error("CAUSE:", cause instanceof Error ? cause.message : cause);
    process.exit(1);
    return;
  }

  printReport(report);

  // Any non-zero unresolved-FK count is unexpected — the validated source data
  // resolves 889/889 org links, so a leftover means a data or mapping drift.
  const unresolvedTotal = Object.values(report.unresolvedFkCounts).reduce(
    (a, b) => a + b,
    0,
  );

  const ok = report.arReconciles && unresolvedTotal === 0;
  console.log(
    `\n${ok ? "✅  Import complete." : "⚠  Import completed WITH CONCERNS."}\n`,
  );
  if (!report.arReconciles) {
    console.log("  → Open AR did not reconcile to the expected $47,145.00.");
  }
  if (unresolvedTotal > 0) {
    console.log(`  → ${unresolvedTotal} row(s) dropped on unresolved FKs (see above).`);
  }

  process.exit(ok ? 0 : 1);
})();

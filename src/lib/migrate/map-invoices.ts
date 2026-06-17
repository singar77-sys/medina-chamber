/**
 * GrowthZone "Membership Invoices" → Postgres `invoices` (+ derived `payments`).
 *
 * Pure mappers: each takes one header-keyed spreadsheet row and returns a plain
 * insert-shaped object. No database, no I/O — the orchestrator resolves the
 * org/membership UUIDs (via gzOrgId) and persists.
 *
 * Money is integer cents everywhere (parseCents → Math.round(dollars*100)).
 *
 * KEY RULE — derive the paid amount from the invoice math, NOT the unreliable
 * "Payment" column: amountPaidCents = Invoice Amount − Invoice Balance, both in
 * integer cents. We subtract cents (never floats) so there is zero FP drift.
 *
 * `invoices.gz_id` = Invoice # as a string (e.g. "109656") — unique per invoice.
 * `payments.gz_id` = "gzpay-" + Invoice # — one derived payment per invoice.
 * Both columns are `text("gz_id").unique()`, so nullable Stripe-originated rows
 * leave them null without violating the unique constraint.
 *
 * gzOrgId (ContactId) and gzInvoiceNumber are still emitted as orchestration-only
 * fields so the orchestrator can resolve org/membership FKs.
 */

import { excelDateToISO, parseCents, cleanStr } from "./coerce";
import { loadRows, type Row } from "./load";
import type { invoices, payments } from "@/lib/db/schema";

/**
 * invoices.$inferInsert subset the mapper populates, plus emitted GrowthZone
 * keys. Required<> drops the insert-optionality those columns carry from their
 * DB defaults (amountPaidCents default 0, status default 'draft') — the mapper
 * always sets them explicitly, so the output type reflects that.
 */
export type MappedInvoice = Required<
  Pick<
    typeof invoices.$inferInsert,
    "amountCents" | "amountPaidCents" | "status" | "description" | "paidAt" | "gzId"
  >
> & {
  /** GrowthZone ContactId — the numeric org join key for FK resolution. */
  gzOrgId: string | null;
  /** GrowthZone "Invoice #" — kept for orchestrator cross-referencing. */
  gzInvoiceNumber: string | null;
};

/** payments.$inferInsert subset (mapper always populates), plus GrowthZone keys. */
export type MappedInvoicePayment = Required<
  Pick<
    typeof payments.$inferInsert,
    "type" | "method" | "amountCents" | "memo" | "occurredAt" | "gzId"
  >
> & {
  gzOrgId: string | null;
  gzInvoiceNumber: string | null;
};

/** Invoice Amount in integer cents (0 when blank/non-numeric). */
function amountCentsOf(row: Row): number {
  return parseCents(row["Invoice Amount"]) ?? 0;
}

/** Invoice Balance (open AR) in integer cents (0 when blank/non-numeric). */
function balanceCentsOf(row: Row): number {
  return parseCents(row["Invoice Balance"]) ?? 0;
}

/**
 * Derived amount paid, in integer cents: Amount − Balance.
 *
 * Subtraction happens on already-rounded cents, so no floating-point error can
 * creep in. Clamped to >= 0: a balance exceeding the amount (over-credit) would
 * otherwise imply a negative "paid", which is meaningless for a charge.
 */
export function derivePaidCents(row: Row): number {
  const paid = amountCentsOf(row) - balanceCentsOf(row);
  return paid > 0 ? paid : 0;
}

/** GrowthZone invoice date as an ISO 'YYYY-MM-DD' string (or null). */
function invoiceDateISO(row: Row): string | null {
  return excelDateToISO(row["Invoice Date"]);
}

/**
 * Map a GrowthZone invoice row to an `invoices` insert object.
 *
 * status (real invoice_status enum: draft|pending|paid|past_due|void|uncollectible):
 *  - balance <= 0            → 'paid'      (nothing owed)
 *  - balance > 0, paid > 0   → 'past_due'  (partially paid, still owing)
 *  - balance > 0, paid <= 0  → 'pending'   (nothing paid; balance == amount)
 */
export function mapInvoice(row: Row): MappedInvoice {
  const amountCents = amountCentsOf(row);
  const balanceCents = balanceCentsOf(row);
  const amountPaidCents = derivePaidCents(row);

  let status: MappedInvoice["status"];
  if (balanceCents <= 0) {
    status = "paid";
  } else if (amountPaidCents > 0) {
    status = "past_due";
  } else {
    status = "pending";
  }

  // paidAt only makes sense once money has moved; use the invoice date as the
  // best available historical timestamp (GrowthZone gives no separate paid date).
  const isoDate = invoiceDateISO(row);
  const paidAt =
    amountPaidCents > 0 && isoDate ? new Date(`${isoDate}T00:00:00.000Z`) : null;

  const gzInvoiceNumber = cleanStr(row["Invoice #"]);

  return {
    amountCents,
    amountPaidCents,
    status,
    description: cleanStr(row["Line Item Description"]),
    paidAt,
    gzId: gzInvoiceNumber,
    gzOrgId: cleanStr(row.ContactId),
    gzInvoiceNumber,
  };
}

/**
 * Map a GrowthZone invoice row to a derived `payments` insert — ONLY when the
 * derived paid amount is positive. Returns null for unpaid invoices so the
 * append-only ledger gets no zero-amount noise.
 *
 * type 'charge' / method 'other': this is historical money already collected by
 * GrowthZone through an unknown channel (no card/ACH/check breakdown survives
 * the export). occurredAt = invoice date (no separate payment date exists).
 */
export function mapInvoicePayment(row: Row): MappedInvoicePayment | null {
  const amountPaidCents = derivePaidCents(row);
  if (amountPaidCents <= 0) return null;

  const gzInvoiceNumber = cleanStr(row["Invoice #"]);
  const isoDate = invoiceDateISO(row);

  return {
    type: "charge",
    method: "other",
    amountCents: amountPaidCents,
    memo: `GrowthZone historical import (invoice ${gzInvoiceNumber ?? "unknown"})`,
    occurredAt: isoDate ? new Date(`${isoDate}T00:00:00.000Z`) : new Date(0),
    gzId: gzInvoiceNumber !== null ? `gzpay-${gzInvoiceNumber}` : null,
    gzOrgId: cleanStr(row.ContactId),
    gzInvoiceNumber,
  };
}

/**
 * Load every real invoice row from the GrowthZone export and map it.
 * Footer/junk rows are stripped by loadRows(); the remainder are the data rows.
 */
export function mapInvoicesFile(filePath: string): {
  invoices: MappedInvoice[];
  payments: MappedInvoicePayment[];
} {
  const rows = loadRows(filePath);
  const mappedInvoices = rows.map(mapInvoice);
  const mappedPayments = rows
    .map(mapInvoicePayment)
    .filter((p): p is MappedInvoicePayment => p !== null);
  return { invoices: mappedInvoices, payments: mappedPayments };
}

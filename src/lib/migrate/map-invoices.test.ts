import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  mapInvoice,
  mapInvoicePayment,
  derivePaidCents,
  mapInvoicesFile,
} from "@/lib/migrate/map-invoices";
import { loadRows, type Row } from "@/lib/migrate/load";
import { parseCents } from "@/lib/migrate/coerce";

const INVOICES_FILE = "C:/Users/Mark/Downloads/Membership Invoices.xlsx";
const INVOICES_FILE_PRESENT = existsSync(INVOICES_FILE);

// Real sample rows from the GrowthZone "Membership Invoices.xlsx" export.
// Headers: ContactId, Contact Name, Account Number, Contact Sales Rep,
// Primary Membership Type, Membership Activation Start Date, Invoice #,
// Invoice Date, Line Item Description, Invoice Amount, Invoice Balance,
// Membership Status, Payment.
const PAID_ROW: Row = {
  ContactId: 22529352,
  "Contact Name": "Fifth Third Bank - Barberton",
  "Account Number": "",
  "Contact Sales Rep": "",
  "Primary Membership Type": "Business Essentials",
  "Membership Activation Start Date": 44868,
  "Invoice #": "109656",
  "Invoice Date": 45352,
  "Line Item Description": "Basic Membership dues",
  "Invoice Amount": 295,
  "Invoice Balance": 0,
  "Membership Status": "Active",
  // "Payment" column is unreliable — here it disagrees with the real paid amount.
  Payment: 0,
};

// Same shape, but fully unpaid: balance == amount, nothing collected.
const UNPAID_ROW: Row = {
  ...PAID_ROW,
  "Invoice #": "109999",
  "Invoice Amount": 295,
  "Invoice Balance": 295,
  "Membership Status": "Dropped",
  Payment: 295, // "Payment" column lies — there was no payment.
};

// Partially paid: amount 575, balance 200 -> paid 375.
const PARTIAL_ROW: Row = {
  ...PAID_ROW,
  "Invoice #": "110001",
  "Invoice Amount": 575,
  "Invoice Balance": 200,
  "Membership Status": "Active",
  Payment: 0,
};

describe("derivePaidCents (Amount − Balance, in cents, never the Payment column)", () => {
  it("returns full amount when balance is zero", () => {
    expect(derivePaidCents(PAID_ROW)).toBe(29500);
  });

  it("returns zero when fully unpaid (balance == amount)", () => {
    expect(derivePaidCents(UNPAID_ROW)).toBe(0);
  });

  it("returns the partial paid amount", () => {
    expect(derivePaidCents(PARTIAL_ROW)).toBe(37500); // 57500 - 20000
  });

  it("ignores the unreliable Payment column entirely", () => {
    // PAID_ROW has Payment=0 but is actually fully paid; UNPAID_ROW has
    // Payment=295 but nothing was actually paid. Derivation must not follow it.
    expect(derivePaidCents(PAID_ROW)).not.toBe(parseCents(PAID_ROW.Payment));
    expect(derivePaidCents(UNPAID_ROW)).not.toBe(parseCents(UNPAID_ROW.Payment));
  });

  it("clamps to zero (never negative) on over-credit", () => {
    const overCredit: Row = { ...PAID_ROW, "Invoice Amount": 100, "Invoice Balance": 250 };
    expect(derivePaidCents(overCredit)).toBe(0);
  });
});

describe("mapInvoice", () => {
  it("maps a fully-paid invoice", () => {
    const inv = mapInvoice(PAID_ROW);
    expect(inv.amountCents).toBe(29500);
    expect(inv.amountPaidCents).toBe(29500);
    expect(inv.status).toBe("paid");
    expect(inv.description).toBe("Basic Membership dues");
    // paidAt = invoice date serial 45352 -> 2024-03-01 (UTC midnight).
    expect(inv.paidAt).toBeInstanceOf(Date);
    expect((inv.paidAt as Date).toISOString().slice(0, 10)).toBe("2024-03-01");
  });

  it("emits the GrowthZone keys (no DB column exists for them)", () => {
    const inv = mapInvoice(PAID_ROW);
    expect(inv.gzOrgId).toBe("22529352");
    expect(inv.gzInvoiceNumber).toBe("109656");
  });

  it("maps a fully-unpaid invoice to 'pending' with no paidAt", () => {
    const inv = mapInvoice(UNPAID_ROW);
    expect(inv.amountCents).toBe(29500);
    expect(inv.amountPaidCents).toBe(0);
    expect(inv.status).toBe("pending");
    expect(inv.paidAt).toBeNull();
  });

  it("maps a partially-paid invoice to 'past_due'", () => {
    const inv = mapInvoice(PARTIAL_ROW);
    expect(inv.amountCents).toBe(57500);
    expect(inv.amountPaidCents).toBe(37500);
    expect(inv.status).toBe("past_due");
    expect(inv.paidAt).toBeInstanceOf(Date);
  });
});

describe("mapInvoicePayment", () => {
  it("emits a 'charge' / 'other' payment for a paid invoice", () => {
    const pay = mapInvoicePayment(PAID_ROW);
    expect(pay).not.toBeNull();
    expect(pay!.type).toBe("charge");
    expect(pay!.method).toBe("other");
    expect(pay!.amountCents).toBe(29500);
    expect(pay!.memo).toBe("GrowthZone historical import (invoice 109656)");
    expect(pay!.occurredAt).toBeInstanceOf(Date);
    expect((pay!.occurredAt as Date).toISOString().slice(0, 10)).toBe("2024-03-01");
    expect(pay!.gzOrgId).toBe("22529352");
    expect(pay!.gzInvoiceNumber).toBe("109656");
  });

  it("emits a payment for the paid portion of a partial invoice", () => {
    const pay = mapInvoicePayment(PARTIAL_ROW);
    expect(pay).not.toBeNull();
    expect(pay!.amountCents).toBe(37500);
  });

  it("returns null when nothing was paid (no zero-amount ledger noise)", () => {
    expect(mapInvoicePayment(UNPAID_ROW)).toBeNull();
  });
});

describe.skipIf(!INVOICES_FILE_PRESENT)(
  "reconciliation over the real GrowthZone export (via loadRows)",
  () => {
  // This describe block reads a real .xlsx from the local Downloads folder.
  // It skips automatically in CI (or on any machine where the file is absent)
  // so `pnpm test` passes everywhere. Run locally to verify the reconciliation.
  //
  // loadRows() strips the GrowthZone footer rows, including the
  // "Count\Average\Totals" summary line whose own Amount cell holds the column
  // total (559130.41) and whose Balance cell holds the AR total (47145.00).
  //
  // The de-footered data total is therefore $559,130.41 amount / $47,145.00 AR
  // across 1,398 real invoice rows. The brief's "~$1,118,260.82 / $94,290.00"
  // targets are exactly DOUBLE these: they only arise if you sum the raw sheet
  // INCLUDING that footer Totals row (data total + the totals-row total =
  // 2× the real sum). Since the brief mandates loading via loadRows — which
  // correctly drops the footer — the authoritative reconciliation total is the
  // single-counted data sum asserted below.
  it("sums Invoice Amount and Invoice Balance to the de-footered data totals", () => {
    const rows = loadRows(INVOICES_FILE);

    let sumAmount = 0;
    let sumBalance = 0;
    for (const row of rows) {
      sumAmount += parseCents(row["Invoice Amount"]) ?? 0;
      sumBalance += parseCents(row["Invoice Balance"]) ?? 0;
    }

    expect(rows).toHaveLength(1398);
    expect(sumAmount).toBe(55913041); // $559,130.41 in cents
    expect(sumBalance).toBe(4714500); // $47,145.00 in cents
  });

  it("amountPaid across all mapped invoices equals amount − balance (cents)", () => {
    const { invoices, payments } = mapInvoicesFile(INVOICES_FILE);

    const sumAmount = invoices.reduce((acc, i) => acc + i.amountCents, 0);
    const sumPaid = invoices.reduce((acc, i) => acc + i.amountPaidCents, 0);
    const sumOpenAr = sumAmount - sumPaid;

    expect(sumAmount).toBe(55913041);
    expect(sumOpenAr).toBe(4714500); // open AR = amount − paid = balance total

    // Every derived payment is a positive charge; their sum equals total paid.
    const sumPaymentRows = payments.reduce((acc, p) => acc + p.amountCents, 0);
    expect(sumPaymentRows).toBe(sumPaid);
    expect(payments.every((p) => p.amountCents > 0)).toBe(true);
    // 1,284 invoices have a positive derived paid amount. The other 114 rows
    // are either fully unpaid (106) or zero-amount placeholders (8: amount 0,
    // balance 0 -> paid 0), and so emit no payment row.
    expect(payments).toHaveLength(1284);
  });
});

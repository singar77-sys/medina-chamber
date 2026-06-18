import { afterAll, describe, expect, it } from "vitest";
import { deriveInvoiceStatus, recordPayment } from "./ledger";

// ── deriveInvoiceStatus (pure) ───────────────────────────────────────────────

describe("deriveInvoiceStatus", () => {
  it("returns 'paid' when paid exactly equals a positive amount", () => {
    expect(deriveInvoiceStatus(10000, 10000)).toBe("paid");
  });

  it("returns 'paid' when overpaid", () => {
    expect(deriveInvoiceStatus(10000, 12000)).toBe("paid");
  });

  it("returns 'pending' when partially paid", () => {
    expect(deriveInvoiceStatus(10000, 7500)).toBe("pending");
  });

  it("returns 'pending' when nothing is paid", () => {
    expect(deriveInvoiceStatus(10000, 0)).toBe("pending");
  });

  it("returns 'pending' for a zero-amount invoice even when paid is also zero", () => {
    // amountCents 0 must never be reported as 'paid' (0 >= 0 would otherwise lie).
    expect(deriveInvoiceStatus(0, 0)).toBe("pending");
  });

  it("returns 'pending' for a zero-amount invoice with a positive paid total", () => {
    expect(deriveInvoiceStatus(0, 500)).toBe("pending");
  });
});

// ── recordPayment (integration — staging DB only) ────────────────────────────
//
// Guarded by DATABASE_URL_UNPOOLED so `pnpm test` stays green on machines / CI
// without staging credentials. When the var is set, this builds its OWN
// session-pooler client (the app singleton in @/lib/db reads DATABASE_URL and
// uses prepare:false for the txn-mode pooler; we want a direct session client
// here so multi-statement transactions behave normally). It creates clearly
// marked temp rows and deletes every one of them in afterAll, so it can never
// pollute staging regardless of pass/fail.

const UNPOOLED_URL = process.env.DATABASE_URL_UNPOOLED;

describe.skipIf(!UNPOOLED_URL)("recordPayment (staging integration)", () => {
  // Imported lazily so the module isn't loaded at all when the suite is skipped.
  let sqlClient: import("postgres").Sql;
  let testDb: import("@/lib/db").DB;

  // Unique, obviously-test identifiers so cleanup is unambiguous.
  const stamp = Date.now();
  const orgSlug = `__test-billing-${stamp}`;
  const orgName = `__TEST Billing Org ${stamp}`;
  const chargeId = `__test_ch_${stamp}`;
  const refundId = `__test_re_${stamp}`;

  let orgId = "";
  let invoiceId = "";

  // Resolved inside beforeAll-equivalent (the first test) to keep imports lazy.
  const setup = async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/lib/db/schema");

    sqlClient = postgres(UNPOOLED_URL!, { ssl: "require", max: 1 });
    testDb = drizzle(sqlClient, { schema }) as unknown as import("@/lib/db").DB;

    const [org] = await testDb
      .insert(schema.organizations)
      .values({ name: orgName, slug: orgSlug, status: "active" })
      .returning({ id: schema.organizations.id });
    orgId = org.id;

    const [inv] = await testDb
      .insert(schema.invoices)
      .values({
        organizationId: orgId,
        amountCents: 10000,
        status: "pending",
        description: orgName,
      })
      .returning({ id: schema.invoices.id });
    invoiceId = inv.id;
  };

  afterAll(async () => {
    if (!sqlClient) return;
    const schema = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    // Order matters: payments reference the invoice and org.
    if (invoiceId) {
      await testDb.delete(schema.payments).where(eq(schema.payments.invoiceId, invoiceId));
      await testDb.delete(schema.invoices).where(eq(schema.invoices.id, invoiceId));
    }
    if (orgId) {
      await testDb.delete(schema.organizations).where(eq(schema.organizations.id, orgId));
    }
    await sqlClient.end();
  });

  it("records a full charge → invoice 'paid', amountPaidCents 10000", async () => {
    await setup();

    const res = await recordPayment(testDb, {
      organizationId: orgId,
      invoiceId,
      type: "charge",
      method: "card",
      amountCents: 10000,
      stripeChargeId: chargeId,
    });

    expect(res.idempotentHit).toBe(false);
    expect(res.amountPaidCents).toBe(10000);
    expect(res.invoiceStatus).toBe("paid");
  });

  it("is idempotent on a redelivered charge (same stripeChargeId)", async () => {
    const schema = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const res = await recordPayment(testDb, {
      organizationId: orgId,
      invoiceId,
      type: "charge",
      method: "card",
      amountCents: 10000,
      stripeChargeId: chargeId,
    });

    expect(res.idempotentHit).toBe(true);
    expect(res.amountPaidCents).toBe(10000);

    // Still exactly one payment row for that charge id.
    const rows = await testDb
      .select({ id: schema.payments.id })
      .from(schema.payments)
      .where(eq(schema.payments.stripeChargeId, chargeId));
    expect(rows).toHaveLength(1);
  });

  it("records a -2500 refund → amountPaidCents 7500, status back to 'pending'", async () => {
    const res = await recordPayment(testDb, {
      organizationId: orgId,
      invoiceId,
      type: "refund",
      method: "card",
      amountCents: -2500,
      stripeRefundId: refundId,
    });

    expect(res.idempotentHit).toBe(false);
    expect(res.amountPaidCents).toBe(7500);
    expect(res.invoiceStatus).toBe("pending");
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

// ── recordPayment idempotency (mocked — runs in CI, no DB) ───────────────────
//
// The integration suite below proves the real flow but stays off unless
// RUN_DB_INTEGRATION is opted in, so the central money invariant — a redelivered Stripe webhook
// must never double-record a payment — would otherwise have ZERO enforcement in
// CI. These pin the two idempotency guards (the check-first fast path and the
// unique-violation race recovery) against a mock db.

describe("recordPayment idempotency (mocked)", () => {
  let selectQueue: unknown[][];
  const limit = vi.fn(async () => selectQueue.shift() ?? []);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const transaction = vi.fn();
  const mockDb = { select, transaction } as never;

  const input = {
    organizationId: "o1",
    invoiceId: "inv1",
    type: "charge" as const,
    method: "card" as const,
    amountCents: 10000,
    stripeChargeId: "ch_1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    selectQueue = [];
  });

  it("redelivered charge (stripeChargeId already recorded) is a no-op — never inserts", async () => {
    // findExisting → the payment row already exists; buildHitResult → its invoice.
    selectQueue = [[{ id: "p1", invoiceId: "inv1" }], [{ status: "paid", amountPaidCents: 10000 }]];
    const res = await recordPayment(mockDb, input);
    expect(res.idempotentHit).toBe(true);
    expect(res.invoiceStatus).toBe("paid");
    expect(transaction).not.toHaveBeenCalled(); // the double-charge guard held
  });

  it("a concurrent duplicate (insert hits a unique violation) recovers without double-recording", async () => {
    // pre-insert findExisting → none; the insert throws 23505; post-throw findExisting → now exists.
    selectQueue = [[], [{ id: "p1", invoiceId: "inv1" }], [{ status: "paid", amountPaidCents: 10000 }]];
    transaction.mockImplementationOnce(async () => {
      const e = new Error("duplicate key value violates unique constraint") as Error & { code?: string };
      e.code = "23505";
      throw e;
    });
    const res = await recordPayment(mockDb, input);
    expect(res.idempotentHit).toBe(true);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("a genuinely new charge enters the insert transaction", async () => {
    selectQueue = [[]]; // findExisting → none
    transaction.mockResolvedValueOnce({
      paymentId: "p2",
      invoiceStatus: "paid",
      amountPaidCents: 10000,
      idempotentHit: false,
    });
    const res = await recordPayment(mockDb, { ...input, stripeChargeId: "ch_new" });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(res.idempotentHit).toBe(false);
  });
});

// ── recordPayment (integration — opt-in, non-production DB only) ─────────────
//
// There is NO staging database. DATABASE_URL_UNPOOLED points at the same
// Supabase project as DATABASE_URL (the one production DB), so "the var is set"
// is NOT a safe trigger: any runner that loads .env.local would write a live
// organizations row here, and if cleanup never ran (crash, Ctrl-C, timeout) it
// would surface in the public member directory.
//
// Two locks, both required. RUN_DB_INTEGRATION=1 must be set deliberately, and
// the URL host must look like a throwaway database. The temp org is also
// inserted as status 'deleted' with deletedAt set, so even a failed cleanup
// leaves nothing the directory query (status 'active' AND deleted_at IS NULL)
// can return.
//
// When it does run it builds its OWN session-pooler client (the app singleton in
// @/lib/db reads DATABASE_URL and uses prepare:false for the txn-mode pooler; we
// want a direct session client here so multi-statement transactions behave
// normally).

function isThrowawayDbHost(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  // Anything else must SAY it is disposable. A bare Supabase/RDS hostname —
  // which is what production looks like — never matches.
  return /(^|[.-])(staging|test|dev|local)([.-]|$)/.test(host);
}

const UNPOOLED_URL = process.env.DATABASE_URL_UNPOOLED;
const DB_INTEGRATION_ENABLED =
  process.env.RUN_DB_INTEGRATION === "1" && !!UNPOOLED_URL && isThrowawayDbHost(UNPOOLED_URL);

describe.skipIf(!DB_INTEGRATION_ENABLED)("recordPayment (DB integration)", () => {
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

  // beforeAll, not "the first test", so afterAll cleanup runs even if a test
  // fails or the suite is interrupted after setup.
  beforeAll(async () => {
    const postgres = (await import("postgres")).default;
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const schema = await import("@/lib/db/schema");

    sqlClient = postgres(UNPOOLED_URL!, { ssl: "require", max: 1 });
    testDb = drizzle(sqlClient, { schema }) as unknown as import("@/lib/db").DB;

    // 'deleted' + deletedAt: invisible to every public query even if cleanup
    // never runs. recordPayment does not read organizations.status.
    const [org] = await testDb
      .insert(schema.organizations)
      .values({ name: orgName, slug: orgSlug, status: "deleted", deletedAt: new Date() })
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
  });

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

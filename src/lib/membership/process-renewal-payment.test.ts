import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let invoiceRow: Record<string, unknown> | undefined;
let infoRow: Record<string, unknown> | undefined;
let advanceRows: { id: string }[];

// select(): invoice-load path is .from().where().limit(); email-info path is
// .from().leftJoin()…leftJoin().where().limit() — distinguished by leftJoin.
const invLimit = vi.fn(async () => (invoiceRow ? [invoiceRow] : []));
const invWhere = vi.fn(() => ({ limit: invLimit }));
const emailLimit = vi.fn(async () => (infoRow ? [infoRow] : []));
const emailWhere = vi.fn(() => ({ limit: emailLimit }));
const leftJoin: ReturnType<typeof vi.fn> = vi.fn(() => ({ leftJoin, where: emailWhere }));
const from = vi.fn(() => ({ where: invWhere, leftJoin }));
const select = vi.fn(() => ({ from }));

const returning = vi.fn(async () => advanceRows);
const updWhere = vi.fn(() => ({ returning }));
const updSet = vi.fn((_v: Record<string, unknown>) => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));

const mockDb = { select, update } as never;

const sendRenewalConfirmation = vi.fn();
vi.mock("./renewal-email", () => ({ sendRenewalConfirmation }));

let processRenewalPayment: typeof import("./process-renewal-payment").processRenewalPayment;
beforeAll(async () => {
  ({ processRenewalPayment } = await import("./process-renewal-payment"));
});

beforeEach(() => {
  vi.clearAllMocks();
  invoiceRow = { membershipId: "m1", periodStart: "2026-07-01", periodEnd: "2027-07-01", status: "paid" };
  infoRow = { orgName: "Acme Co", tierName: "Standard", email: "ann@acme.co", firstName: "Ann" };
  advanceRows = [{ id: "m1" }];
});

describe("processRenewalPayment", () => {
  it("advances renewalDate to periodEnd, reactivates, and emails", async () => {
    const ok = await processRenewalPayment(mockDb, "inv1");
    expect(ok).toBe(true);
    const setArg = updSet.mock.calls[0][0];
    expect(setArg.status).toBe("active");
    expect(setArg.renewalDate).toBe("2027-07-01");
    expect(sendRenewalConfirmation).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: an already-advanced period is a no-op (no email)", async () => {
    advanceRows = []; // the guarded UPDATE matched nothing (renewalDate already moved)
    const ok = await processRenewalPayment(mockDb, "inv1");
    expect(ok).toBe(false);
    expect(sendRenewalConfirmation).not.toHaveBeenCalled();
  });

  it("ignores a non-renewal invoice (no membership / no period)", async () => {
    invoiceRow = { membershipId: null, periodStart: null, periodEnd: null, status: "paid" };
    const ok = await processRenewalPayment(mockDb, "inv1");
    expect(ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("ignores an invoice that isn't fully paid", async () => {
    invoiceRow = { membershipId: "m1", periodStart: "2026-07-01", periodEnd: "2027-07-01", status: "pending" };
    const ok = await processRenewalPayment(mockDb, "inv1");
    expect(ok).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns false when the invoice doesn't exist", async () => {
    invoiceRow = undefined;
    const ok = await processRenewalPayment(mockDb, "missing");
    expect(ok).toBe(false);
  });
});

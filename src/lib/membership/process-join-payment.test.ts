import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const recordPayment = vi.fn(async () => ({
  paymentId: "p1",
  invoiceStatus: "paid",
  amountPaidCents: 34500,
  idempotentHit: false,
}));
vi.mock("@/lib/billing/ledger", () => ({ recordPayment }));

const activateMembership = vi.fn(async () => true);
vi.mock("./join", () => ({ activateMembership }));

const sendWelcomeEmail = vi.fn(async () => {});
const notifyStaffNewMember = vi.fn(async () => {});
vi.mock("./welcome-email", () => ({ sendWelcomeEmail, notifyStaffNewMember }));

let detailRow: Record<string, unknown> | undefined;
// from().innerJoin().innerJoin().leftJoin().where().limit() — flat spy chain.
const limit = vi.fn(async () => (detailRow ? [detailRow] : []));
const selWhere = vi.fn(() => ({ limit }));
const leftJoin = vi.fn(() => ({ where: selWhere }));
const innerJoin2 = vi.fn(() => ({ leftJoin }));
const innerJoin1 = vi.fn(() => ({ innerJoin: innerJoin2 }));
const from = vi.fn(() => ({ innerJoin: innerJoin1 }));
const select = vi.fn(() => ({ from }));
// processJoinPayment takes `db` as a parameter, so pass this directly.
const mockDb = { select };

let processJoinPayment: typeof import("./process-join-payment").processJoinPayment;
beforeAll(async () => {
  ({ processJoinPayment } = await import("./process-join-payment"));
});

const INPUT = {
  organizationId: "org1",
  invoiceId: "inv1",
  membershipId: "m1",
  amountReceived: 34500,
  stripeChargeId: "ch1",
  stripePaymentMethodId: "pm1",
};

beforeEach(() => {
  vi.clearAllMocks();
  detailRow = { orgName: "Acme Co", tierName: "Business Essentials", cFirst: "Jane", cLast: "Doe", cEmail: "jane@acme.co" };
  activateMembership.mockResolvedValue(true);
});

describe("processJoinPayment", () => {
  it("records the charge and sends welcome + staff emails on activation", async () => {
    await processJoinPayment(mockDb as never, INPUT);

    expect(recordPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: "org1",
        invoiceId: "inv1",
        type: "charge",
        amountCents: 34500,
        stripeChargeId: "ch1",
      }),
    );
    expect(sendWelcomeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "jane@acme.co", firstName: "Jane", businessName: "Acme Co", tierName: "Business Essentials" }),
    );
    expect(notifyStaffNewMember).toHaveBeenCalledTimes(1);
  });

  it("records the charge but sends NO email on a redelivery (already active)", async () => {
    activateMembership.mockResolvedValue(false);
    await processJoinPayment(mockDb as never, INPUT);

    expect(recordPayment).toHaveBeenCalledTimes(1); // idempotent at the ledger anyway
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(notifyStaffNewMember).not.toHaveBeenCalled();
  });

  it("skips the welcome when the new member has no contact email", async () => {
    detailRow = { orgName: "Acme Co", tierName: "Business Essentials", cFirst: null, cLast: null, cEmail: null };
    await processJoinPayment(mockDb as never, INPUT);
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The Stripe client module throws at import time if STRIPE_SECRET_KEY is unset,
// and the route reads STRIPE_WEBHOOK_SECRET. Stub both before anything imports
// them. A fake test-mode key is fine — we never hit the network here; signing is
// pure local HMAC over the webhook secret.
const WEBHOOK_SECRET = "whsec_test_secret_for_unit_tests";
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);

// Mock the ledger so we assert on calls without touching a database.
const recordPayment = vi.fn().mockResolvedValue({
  paymentId: "pay_test",
  invoiceStatus: "paid",
  amountPaidCents: 10000,
  idempotentHit: false,
});
vi.mock("@/lib/billing/ledger", () => ({ recordPayment }));

// Mock the db barrel so importing the route doesn't try to open a connection.
const dbUpdate = vi.fn(() => ({
  set: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
}));

// Event-registration confirm path:
// db.transaction(tx => tx.select(...).limit(1).for("update") + tx.update(...) ×N).
let regRow: Record<string, unknown> | undefined;
const txForUpdate = vi.fn(async () => (regRow ? [regRow] : []));
const txSelect = vi.fn(() => ({
  from: () => ({ where: () => ({ limit: () => ({ for: txForUpdate }) }) }),
}));
const txUpdWhere = vi.fn(async () => undefined);
const txSet = vi.fn(() => ({ where: txUpdWhere }));
const txUpdate = vi.fn(() => ({ set: txSet }));
const transaction = vi.fn(
  async (fn: (tx: { select: typeof txSelect; update: typeof txUpdate }) => Promise<boolean>) =>
    fn({ select: txSelect, update: txUpdate }),
);

vi.mock("@/lib/db", () => ({ db: { update: dbUpdate, transaction } }));

const notifyRegistration = vi.fn(async () => {});
vi.mock("@/lib/events/notify-registration", () => ({ notifyRegistration }));

const processJoinPayment = vi.fn(async (_db: unknown, _input: Record<string, unknown>) => {});
vi.mock("@/lib/membership/process-join-payment", () => ({ processJoinPayment }));

const processRenewalPayment = vi.fn(async (_db: unknown, _invoiceId: string) => false);
vi.mock("@/lib/membership/process-renewal-payment", () => ({ processRenewalPayment }));

// Resolved in beforeAll after env is stubbed.
let stripe: import("stripe").default;
let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  stripe = (await import("@/lib/stripe/client")).stripe;
  POST = (await import("./route")).POST;
});

afterEach(() => {
  recordPayment.mockClear();
  dbUpdate.mockClear();
  transaction.mockClear();
  txUpdate.mockClear();
  txSet.mockClear();
  notifyRegistration.mockClear();
  processJoinPayment.mockClear();
  processRenewalPayment.mockClear();
  regRow = undefined;
});

function makeRequest(payload: string, signature: string): Request {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: payload,
  });
}

function signed(event: unknown): { payload: string; sig: string } {
  const payload = JSON.stringify(event);
  const sig = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET,
  });
  return { payload, sig };
}

describe("POST /api/stripe/webhook — signature handling", () => {
  it("rejects a tampered signature with 400 and does not touch the ledger", async () => {
    const { payload } = signed({ id: "evt_1", type: "payment_intent.succeeded" });
    const res = await POST(makeRequest(payload, "t=1,v1=deadbeef"));
    expect(res.status).toBe(400);
    expect(recordPayment).not.toHaveBeenCalled();
  });

  it("rejects a blank signature with 400", async () => {
    const { payload } = signed({ id: "evt_2", type: "payment_intent.succeeded" });
    const res = await POST(makeRequest(payload, ""));
    expect(res.status).toBe(400);
    expect(recordPayment).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — payment_intent.succeeded", () => {
  it("records a charge with the right args when metadata is present", async () => {
    const event = {
      id: "evt_3",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_123",
          amount: 10000,
          amount_received: 10000,
          latest_charge: "ch_123",
          payment_method: "pm_123",
          metadata: { invoiceId: "inv_abc", organizationId: "org_abc" },
        },
      },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(recordPayment).toHaveBeenCalledTimes(1);
    const [, arg] = recordPayment.mock.calls[0];
    expect(arg).toMatchObject({
      organizationId: "org_abc",
      invoiceId: "inv_abc",
      type: "charge",
      method: "card",
      amountCents: 10000,
      stripeChargeId: "ch_123",
      stripePaymentMethodId: "pm_123",
    });
    // A fully-paid dues invoice runs renewal advancement (no-ops for non-renewals).
    expect(processRenewalPayment).toHaveBeenCalledWith(expect.anything(), "inv_abc");
  });

  it("does NOT run renewal advancement when the invoice isn't fully paid", async () => {
    recordPayment.mockResolvedValueOnce({
      paymentId: "pay_partial",
      invoiceStatus: "pending",
      amountPaidCents: 5000,
      idempotentHit: false,
    });
    const event = {
      id: "evt_partial",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_partial",
          amount: 5000,
          amount_received: 5000,
          latest_charge: "ch_p",
          metadata: { invoiceId: "inv_p", organizationId: "org_p" },
        },
      },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(recordPayment).toHaveBeenCalledTimes(1);
    expect(processRenewalPayment).not.toHaveBeenCalled();
  });

  it("returns 200 but does NOT record when metadata is missing", async () => {
    const event = {
      id: "evt_4",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_456",
          amount: 5000,
          amount_received: 5000,
          latest_charge: "ch_456",
          metadata: {},
        },
      },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(recordPayment).not.toHaveBeenCalled();
  });

  it("ignores an unhandled event type with 200 and no ledger call", async () => {
    const event = { id: "evt_5", type: "customer.created", data: { object: {} } };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(recordPayment).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — event registration", () => {
  it("confirms a pending registration and bumps counts (not the dues ledger)", async () => {
    regRow = { id: "reg_1", eventId: "evt_1", ticketId: "tk_1", quantity: 2, amountCents: 10000, status: "pending" };
    const event = {
      id: "evt_pi",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_evt",
          amount: 10000,
          amount_received: 10000,
          metadata: { registrationId: "reg_1", eventId: "evt_1" },
        },
      },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(transaction).toHaveBeenCalledTimes(1);
    // registration + event + ticket rows updated; dues ledger untouched
    expect(txUpdate).toHaveBeenCalledTimes(3);
    expect(recordPayment).not.toHaveBeenCalled();
    expect(notifyRegistration).toHaveBeenCalledWith("reg_1"); // email on confirm
  });

  it("leaves the registration pending when the amount paid is short", async () => {
    regRow = { id: "reg_1", eventId: "evt_1", ticketId: "tk_1", quantity: 2, amountCents: 10000, status: "pending" };
    const event = {
      id: "evt_pi_short",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_short",
          amount: 5000,
          amount_received: 5000,
          metadata: { registrationId: "reg_1" },
        },
      },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));
    expect(res.status).toBe(200);
    expect(txUpdate).not.toHaveBeenCalled(); // underpaid → not confirmed
    expect(notifyRegistration).not.toHaveBeenCalled();
  });

  it("is an idempotent no-op when the registration is already confirmed", async () => {
    regRow = { id: "reg_1", eventId: "evt_1", ticketId: "tk_1", quantity: 2, status: "confirmed" };
    const event = {
      id: "evt_pi2",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_evt2", amount: 10000, metadata: { registrationId: "reg_1" } } },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(txUpdate).not.toHaveBeenCalled();
    expect(notifyRegistration).not.toHaveBeenCalled();
  });

  it("acks (200) when the registration row is missing", async () => {
    regRow = undefined;
    const event = {
      id: "evt_pi3",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_evt3", amount: 10000, metadata: { registrationId: "missing" } } },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(txUpdate).not.toHaveBeenCalled();
    expect(notifyRegistration).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — join", () => {
  it("routes a join payment to processJoinPayment (not the dues ledger branch)", async () => {
    const event = {
      id: "evt_join",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_join",
          amount: 34500,
          amount_received: 34500,
          latest_charge: "ch_j",
          payment_method: "pm_j",
          metadata: { type: "join", organizationId: "org1", invoiceId: "inv1", membershipId: "m1" },
        },
      },
    };
    const { payload, sig } = signed(event);
    const res = await POST(makeRequest(payload, sig));

    expect(res.status).toBe(200);
    expect(processJoinPayment).toHaveBeenCalledTimes(1);
    const arg = processJoinPayment.mock.calls[0][1] as Record<string, unknown>;
    expect(arg).toMatchObject({
      organizationId: "org1",
      invoiceId: "inv1",
      membershipId: "m1",
      amountReceived: 34500,
      stripeChargeId: "ch_j",
    });
    expect(recordPayment).not.toHaveBeenCalled(); // not the dues branch
  });
});

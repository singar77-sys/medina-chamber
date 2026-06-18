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
vi.mock("@/lib/db", () => ({ db: { update: dbUpdate } }));

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

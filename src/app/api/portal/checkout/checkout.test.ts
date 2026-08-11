import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// The Stripe client module throws at import time if STRIPE_SECRET_KEY is unset.
// Stub it before anything imports the route. We mock the stripe client itself
// below, so no real key is ever used.
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");
// The route is dormant (404) unless internal transactions are enabled; turn the
// kill switch on so these tests exercise the real authorization + checkout logic.
vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");

// ── Mocks ─────────────────────────────────────────────────────────────────────
//
// The route resolves the member via the portal session cookie. We mock both the
// cookie store (next/headers) and the verifier so we control which org the
// "logged-in" member belongs to without any real crypto or cookies.

const SESSION_ORG = "org_member";

const cookieGet = vi.fn(() => ({ value: "fake-session-token" }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const verifyPortalSession = vi.fn(async () => ({
  contactId: "contact_1",
  organizationId: SESSION_ORG,
  exp: Date.now() + 60_000,
}));
vi.mock("@/lib/portal-session", () => ({
  PORTAL_COOKIE: "portal_session",
  verifyPortalSession,
}));

// db.select(...).from(...).where(...).limit(...) resolves to whatever the
// current test loaded into `invoiceRow`.
let invoiceRow: Record<string, unknown> | undefined;
const limit = vi.fn(async () => (invoiceRow ? [invoiceRow] : []));
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

// ensureStripeCustomer is exercised separately; here we just need a customer id.
const ensureStripeCustomer = vi.fn(async () => "cus_test_123");
vi.mock("@/lib/stripe/customer", () => ({ ensureStripeCustomer }));

// The Stripe client — only checkout.sessions.create is touched. Type the params
// so `calls[0][0]` is the create-args object rather than an empty tuple.
interface CheckoutCreateArgs {
  mode: string;
  customer: string;
  line_items: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string };
    };
    quantity: number;
  }>;
  payment_intent_data: { metadata: Record<string, string> };
  metadata: Record<string, string>;
  success_url: string;
  cancel_url: string;
}

const sessionsCreate = vi.fn(async (_args: CheckoutCreateArgs) => ({
  id: "cs_test_1",
  url: "https://checkout.stripe.com/c/pay/cs_test_1",
}));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { create: sessionsCreate } } },
}));

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  POST = (await import("./route")).POST;
});

afterEach(() => {
  invoiceRow = undefined;
  cookieGet.mockClear();
  verifyPortalSession.mockClear();
  ensureStripeCustomer.mockClear();
  sessionsCreate.mockClear();
  // Default: a logged-in member whose org is SESSION_ORG.
  verifyPortalSession.mockResolvedValue({
    contactId: "contact_1",
    organizationId: SESSION_ORG,
    exp: Date.now() + 60_000,
  });
  cookieGet.mockReturnValue({ value: "fake-session-token" });
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/portal/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/portal/checkout — authorization", () => {
  it("returns 403 when the invoice belongs to a different org and never touches Stripe", async () => {
    invoiceRow = {
      id: "inv_foreign",
      organizationId: "org_someone_else", // NOT the member's org
      description: "Annual dues",
      amountCents: 10000,
      amountPaidCents: 0,
    };

    const res = await POST(makeRequest({ invoiceId: "inv_foreign" }));

    expect(res.status).toBe(403);
    expect(ensureStripeCustomer).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/portal/checkout — happy path", () => {
  it("creates a Checkout Session for the open balance with attribution metadata", async () => {
    invoiceRow = {
      id: "inv_abc",
      organizationId: SESSION_ORG,
      description: "2026 Membership dues",
      amountCents: 57500,
      amountPaidCents: 7500, // balance = 50000
    };

    const res = await POST(makeRequest({ invoiceId: "inv_abc" }));
    expect(res.status).toBe(200);

    const json = (await res.json()) as { url?: string };
    expect(json.url).toBe("https://checkout.stripe.com/c/pay/cs_test_1");

    expect(ensureStripeCustomer).toHaveBeenCalledTimes(1);
    expect(sessionsCreate).toHaveBeenCalledTimes(1);

    const args = sessionsCreate.mock.calls[0][0];

    expect(args.mode).toBe("payment");
    expect(args.customer).toBe("cus_test_123");

    // unit_amount must be the open balance (amountCents - amountPaidCents).
    expect(args.line_items[0].price_data.unit_amount).toBe(50000);
    expect(args.line_items[0].quantity).toBe(1);
    expect(args.line_items[0].price_data.currency).toBe("usd");
    expect(args.line_items[0].price_data.product_data.name).toBe(
      "2026 Membership dues",
    );

    // CRITICAL: the webhook reads these off the PaymentIntent metadata.
    expect(args.payment_intent_data.metadata).toEqual({
      invoiceId: "inv_abc",
      organizationId: SESSION_ORG,
    });
    // Session-level metadata mirrors it.
    expect(args.metadata).toEqual({
      invoiceId: "inv_abc",
      organizationId: SESSION_ORG,
    });
  });
});

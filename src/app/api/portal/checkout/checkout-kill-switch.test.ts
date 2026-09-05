import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * INTERNAL_TRANSACTIONS_ENABLED is a production kill switch, not a feature flag.
 *
 * GrowthZone is still the live system of record for every member transaction;
 * this repo's Stripe/billing backend is built but DORMANT. The switch must stay
 * UNSET in production until the ops cutover. The reason it exists at all is a
 * real incident: a renewal cron ran against production for roughly two weeks,
 * flipping 23 memberships to past_due and generating 1,477 invoices before
 * anyone noticed. A dormant endpoint that silently wakes up is exactly that
 * failure again, with a customer's card attached.
 *
 * checkout.test.ts stubs the switch ON at module scope so it can exercise the
 * authorization + Stripe logic. This file is the mirror image: it never stubs
 * the switch at module scope, so each test controls it, and it proves the
 * refusal is a real refusal - a 404 before ANY session read, DB read, or Stripe
 * call - rather than a 500 that happens to look like a failure.
 */

// @/lib/stripe/client throws at import time without a key. The client itself is
// mocked below, so no real key is ever used.
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");

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

const limit = vi.fn(async () => [
  {
    id: "inv_abc",
    organizationId: SESSION_ORG,
    description: "2026 Membership dues",
    amountCents: 50000,
    amountPaidCents: 0,
  },
]);
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

const ensureStripeCustomer = vi.fn(async () => "cus_test_123");
vi.mock("@/lib/stripe/customer", () => ({ ensureStripeCustomer }));

const sessionsCreate = vi.fn(async (_args: unknown) => ({
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

beforeEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue({ value: "fake-session-token" });
});

afterEach(() => {
  // Leave STRIPE_SECRET_KEY in place (module-scope stub); only clear per-test.
  vi.unstubAllEnvs();
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");
});

/**
 * Each request gets its own client IP so the real per-IP checkout limiter
 * (10/min, in-memory in tests) can never be what fails an assertion.
 */
let ipCounter = 0;
function post(body: unknown = { invoiceId: "inv_abc" }): Promise<Response> {
  ipCounter += 1;
  return POST(
    new Request("https://medinaohchamber.com/api/portal/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": `203.0.113.${ipCounter}`,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function expectNothingHappened() {
  // The refusal must land before any of these - a 404 that still read the
  // session cookie or hit Stripe would mean the endpoint is only half-dormant.
  expect(verifyPortalSession).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
  expect(ensureStripeCustomer).not.toHaveBeenCalled();
  expect(sessionsCreate).not.toHaveBeenCalled();
}

describe("POST /api/portal/checkout - dormant unless INTERNAL_TRANSACTIONS_ENABLED === 'true'", () => {
  it("refuses with 404 when the switch is completely unset (the production state)", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", undefined as unknown as string);

    const res = await post();

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expectNothingHappened();
  });

  it.each([
    ["empty string", ""],
    ["false", "false"],
    ["0", "0"],
    ["1", "1"],
    ["yes", "yes"],
    ["enabled", "enabled"],
    // Case matters: the comparison is === "true", so a typo'd env value in
    // Vercel must fail CLOSED, not open.
    ["TRUE", "TRUE"],
    ["True", "True"],
    [" true (with whitespace)", " true "],
  ])("refuses with 404 when the switch is %s", async (_label, value) => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", value);

    const res = await post();

    expect(res.status).toBe(404);
    expectNothingHappened();
  });

  it("refuses with 404 - not 500 - even when the body is unparseable garbage", async () => {
    // A 500 here would leak that the route exists and would show up as a real
    // error in Sentry every time a scanner probes it.
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", undefined as unknown as string);

    const res = await post("}{ not json");

    expect(res.status).toBe(404);
    expectNothingHappened();
  });

  it("refuses with 404 - not 401 - when there is no portal session cookie", async () => {
    // The route must look absent, not merely unauthorized: an unauthenticated
    // 401 tells a probe that a live checkout endpoint is sitting there.
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", undefined as unknown as string);
    cookieGet.mockReturnValue(undefined as unknown as { value: string });

    const res = await post();

    expect(res.status).toBe(404);
    expectNothingHappened();
  });

  it("never returns a Stripe Checkout URL while the switch is off", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", undefined as unknown as string);

    const body = (await (await post()).json()) as Record<string, unknown>;

    expect(body).not.toHaveProperty("url");
  });

  it("PROCEEDS to Stripe once the switch is explicitly 'true'", async () => {
    // Without this the suite could pass with a route that 404s unconditionally,
    // which would make the kill-switch assertions above meaningless.
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");

    const res = await post();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
    });
    expect(verifyPortalSession).toHaveBeenCalledTimes(1);
    expect(sessionsCreate).toHaveBeenCalledTimes(1);
  });
});

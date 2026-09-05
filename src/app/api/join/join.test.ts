import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { contacts, membershipTiers } from "@/lib/db/schema";

vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");
// The dormant-backend guard 404s this route unless internal transactions are on;
// these tests exercise the transactional path that runs once the flag is set.
vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: vi.fn(async () => null),
  joinLimiter: {},
}));
// @/lib/email is NOT mocked: EMAIL_RE is exported from source, and a hand-copied
// regex here would silently stop testing the real one the moment it changed.
// The module only constructs a Resend client (no env read, no socket) and this
// route never sends mail, so importing it for real is free.
vi.mock("@/lib/sanitize", () => ({
  pickString: (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : ""),
  pickOptional: (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : ""),
}));

const createPendingMember = vi.fn(async () => ({
  organizationId: "org1",
  contactId: "c1",
  membershipId: "m1",
  invoiceId: "inv1",
}));
const generateOrgSlug = vi.fn(async () => "acme-co");
vi.mock("@/lib/membership/join", () => ({ createPendingMember, generateOrgSlug }));

const sessionsCreate = vi.fn(async (_a: unknown) => ({ url: "https://checkout.stripe.com/c/pay/x" }));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { create: sessionsCreate } } },
}));

let contactRow: Record<string, unknown> | undefined;
let tierRow: Record<string, unknown> | undefined;
let lastFrom: unknown;
const limit = vi.fn(async () => {
  if (lastFrom === contacts) return contactRow ? [contactRow] : [];
  if (lastFrom === membershipTiers) return tierRow ? [tierRow] : [];
  return [];
});
const where = vi.fn(() => ({ limit }));
const from = vi.fn((t: unknown) => {
  lastFrom = t;
  return { where };
});
const select = vi.fn(() => ({ from }));
const delWhere = vi.fn(async () => undefined);
const del = vi.fn(() => ({ where: delWhere }));
const transaction = vi.fn(async (fn: (tx: { delete: typeof del }) => Promise<unknown>) => fn({ delete: del }));
vi.mock("@/lib/db", () => ({ db: { select, delete: del, transaction } }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST as unknown as (req: Request) => Promise<Response>;
});

const TIER = { id: "tier_std", name: "Business Essentials", annualPriceCents: 34500 };
const VALID = {
  businessName: "Acme Co",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@acme.co",
  phone: "330-555-1212",
  tier: "standard",
};

afterEach(() => {
  vi.clearAllMocks();
  contactRow = undefined;
  tierRow = TIER;
  lastFrom = undefined;
  sessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/c/pay/x" });
  createPendingMember.mockResolvedValue({
    organizationId: "org1",
    contactId: "c1",
    membershipId: "m1",
    invoiceId: "inv1",
  });
});

function req(body: unknown): Request {
  return new Request("http://localhost/api/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/join — dormant backend", () => {
  it("404s before any work when internal transactions are disabled", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "");
    const res = await POST(req(VALID));
    expect(res.status).toBe(404);
    expect(createPendingMember).not.toHaveBeenCalled();
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");
  });
});

describe("POST /api/join — anti-spam", () => {
  it("silently 200s a honeypot hit and touches nothing", async () => {
    const res = await POST(req({ ...VALID, website_confirm: "iamabot" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(createPendingMember).not.toHaveBeenCalled();
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("silently 200s a too-fast submission", async () => {
    const res = await POST(req({ ...VALID, formLoadedAt: Date.now() })); // fillMs ~ 0 < 1500
    expect(res.status).toBe(200);
    expect(createPendingMember).not.toHaveBeenCalled();
  });
});

describe("POST /api/join — validation", () => {
  it("400s on missing required fields", async () => {
    expect((await POST(req({ businessName: "X" }))).status).toBe(400);
    expect(createPendingMember).not.toHaveBeenCalled();
  });
  it("400s on an invalid email", async () => {
    expect((await POST(req({ ...VALID, email: "nope" }))).status).toBe(400);
  });
  it("409s when the email already has an account", async () => {
    contactRow = { id: "existing" };
    const res = await POST(req(VALID));
    expect(res.status).toBe(409);
    expect(createPendingMember).not.toHaveBeenCalled();
  });
  it("400s when the tier is not an active paid tier", async () => {
    tierRow = undefined;
    const res = await POST(req(VALID));
    expect(res.status).toBe(400);
    expect(createPendingMember).not.toHaveBeenCalled();
  });
});

describe("POST /api/join — happy path", () => {
  it("creates the member and a Checkout session with join metadata + tier price", async () => {
    const res = await POST(req(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/x" });

    expect(createPendingMember).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tierId: "tier_std", amountCents: 34500, slug: "acme-co", email: "jane@acme.co" }),
    );

    const args = sessionsCreate.mock.calls[0][0] as {
      customer_email: string;
      line_items: Array<{ price_data: { unit_amount: number } }>;
      metadata: Record<string, string>;
      payment_intent_data: { metadata: Record<string, string> };
    };
    expect(args.customer_email).toBe("jane@acme.co");
    expect(args.line_items[0].price_data.unit_amount).toBe(34500);
    expect(args.metadata).toMatchObject({ type: "join", invoiceId: "inv1", organizationId: "org1", membershipId: "m1" });
    expect(args.payment_intent_data.metadata).toMatchObject({ type: "join", membershipId: "m1" });
  });

  it("cleans up the prospect + invoice (in a transaction) and 500s if Checkout creation fails", async () => {
    sessionsCreate.mockRejectedValueOnce(new Error("stripe down"));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledTimes(2); // invoice, then org (cascades contact+membership)
  });

  it("409s (not 500) when the unique-email insert loses a race", async () => {
    createPendingMember.mockRejectedValueOnce(Object.assign(new Error("dup"), { code: "23505" }));
    const res = await POST(req(VALID));
    expect(res.status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

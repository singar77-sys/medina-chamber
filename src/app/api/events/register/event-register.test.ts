import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { events, eventTickets } from "@/lib/db/schema";

// Stripe client throws at import without a key — stub before importing the route.
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy_key_for_unit_tests");

// ── Mocks ─────────────────────────────────────────────────────────────────────

const SESSION = {
  contactId: "contact_1",
  organizationId: "org_1",
  exp: Date.now() + 60_000,
};

const cookieGet = vi.fn<() => { value: string } | undefined>(() => undefined);
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const verifyPortalSession = vi.fn<() => Promise<typeof SESSION | null>>(
  async () => null,
);
vi.mock("@/lib/portal-session", () => ({
  PORTAL_COOKIE: "portal_session",
  verifyPortalSession,
}));

vi.mock("@/lib/rate-limit", () => ({
  limitEventRegister: vi.fn(async () => null),
}));

vi.mock("@/lib/email", () => ({
  EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}));

const ensureStripeCustomer = vi.fn(async () => "cus_test_123");
vi.mock("@/lib/stripe/customer", () => ({ ensureStripeCustomer }));

interface CheckoutArgs {
  mode: string;
  customer?: string;
  customer_email?: string;
  line_items: Array<{
    price?: string;
    price_data?: { currency: string; unit_amount: number; product_data: { name: string } };
    quantity: number;
  }>;
  payment_intent_data: { metadata: Record<string, string> };
  metadata: Record<string, string>;
  success_url: string;
  cancel_url: string;
}
const sessionsCreate = vi.fn(async (_a: CheckoutArgs) => ({
  id: "cs_1",
  url: "https://checkout.stripe.com/c/pay/cs_1",
}));
vi.mock("@/lib/stripe/client", () => ({
  stripe: { checkout: { sessions: { create: sessionsCreate } } },
}));

// db mock: select dispatches on the table; insert/update/transaction are spies.
let eventRow: Record<string, unknown> | undefined;
let ticketRow: Record<string, unknown> | undefined;
let lastFrom: unknown;

const limit = vi.fn(async () => {
  if (lastFrom === events) return eventRow ? [eventRow] : [];
  if (lastFrom === eventTickets) return ticketRow ? [ticketRow] : [];
  return [];
});
const selWhere = vi.fn(() => ({ limit }));
const from = vi.fn((tbl: unknown) => {
  lastFrom = tbl;
  return { where: selWhere };
});
const select = vi.fn(() => ({ from }));

const returning = vi.fn(async () => [{ id: "reg_1" }]);
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));
const updWhere = vi.fn(async () => undefined);
const set = vi.fn(() => ({ where: updWhere }));
const update = vi.fn(() => ({ set }));
const transaction = vi.fn(
  async (fn: (tx: { insert: typeof insert; update: typeof update }) => Promise<unknown>) =>
    fn({ insert, update }),
);
const delWhere = vi.fn(async () => undefined);
const del = vi.fn(() => ({ where: delWhere }));

vi.mock("@/lib/db", () => ({ db: { select, insert, transaction, delete: del } }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST;
});

const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000);
function publishedEvent(over: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    slug: "biz-lunch",
    title: "Business Lunch",
    status: "published",
    isMembersOnly: false,
    startsAt: FUTURE,
    maxCapacity: null,
    registrationCount: 0,
    registrationOpenAt: null,
    registrationCloseAt: null,
    ...over,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue(undefined);
  verifyPortalSession.mockResolvedValue(null);
  returning.mockResolvedValue([{ id: "reg_1" }]);
  sessionsCreate.mockResolvedValue({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
  eventRow = publishedEvent();
  ticketRow = undefined;
  lastFrom = undefined;
});

function req(body: unknown): Request {
  return new Request("http://localhost/api/events/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
function asMember() {
  cookieGet.mockReturnValue({ value: "tok" });
  verifyPortalSession.mockResolvedValue(SESSION);
}

describe("POST /api/events/register — validation & gating", () => {
  it("400s without an eventId", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("404s when the event does not exist", async () => {
    eventRow = undefined;
    const res = await POST(req({ eventId: "nope", guestName: "A", guestEmail: "a@b.co" }));
    expect(res.status).toBe(404);
  });

  it("400s when the event is not published", async () => {
    eventRow = publishedEvent({ status: "draft" });
    expect((await POST(req({ eventId: "evt_1", guestName: "A", guestEmail: "a@b.co" }))).status).toBe(400);
  });

  it("400s when registration has closed", async () => {
    eventRow = publishedEvent({ registrationCloseAt: new Date(Date.now() - 1000) });
    expect((await POST(req({ eventId: "evt_1", guestName: "A", guestEmail: "a@b.co" }))).status).toBe(400);
  });

  it("400s when the event has already started", async () => {
    eventRow = publishedEvent({ startsAt: new Date(Date.now() - 1000) });
    expect((await POST(req({ eventId: "evt_1", guestName: "A", guestEmail: "a@b.co" }))).status).toBe(400);
  });

  it("400s a guest with no name/email", async () => {
    expect((await POST(req({ eventId: "evt_1" }))).status).toBe(400);
  });

  it("400s a guest with an invalid email", async () => {
    expect((await POST(req({ eventId: "evt_1", guestName: "A", guestEmail: "nope" }))).status).toBe(400);
  });

  it("403s a guest on a members-only event and writes nothing", async () => {
    eventRow = publishedEvent({ isMembersOnly: true });
    const res = await POST(req({ eventId: "evt_1", guestName: "A", guestEmail: "a@b.co" }));
    expect(res.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("403s a guest on a members-only ticket", async () => {
    ticketRow = { id: "t1", name: "Member Rate", priceCents: 0, stripePriceId: null, maxQuantity: null, soldCount: 0, isMemberOnly: true };
    const res = await POST(req({ eventId: "evt_1", ticketId: "t1", guestName: "A", guestEmail: "a@b.co" }));
    expect(res.status).toBe(403);
  });

  it("400s a ticket that doesn't belong to the event", async () => {
    ticketRow = undefined; // ticket lookup returns nothing
    const res = await POST(req({ eventId: "evt_1", ticketId: "foreign", guestName: "A", guestEmail: "a@b.co" }));
    expect(res.status).toBe(400);
  });

  it("400s an out-of-range quantity", async () => {
    expect((await POST(req({ eventId: "evt_1", quantity: 0, guestName: "A", guestEmail: "a@b.co" }))).status).toBe(400);
    expect((await POST(req({ eventId: "evt_1", quantity: 99, guestName: "A", guestEmail: "a@b.co" }))).status).toBe(400);
  });
});

describe("POST /api/events/register — free RSVP", () => {
  it("confirms a guest immediately and bumps the registration count (no Stripe)", async () => {
    const res = await POST(req({ eventId: "evt_1", guestName: "Jane Guest", guestEmail: "JANE@x.co" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "confirmed", registrationId: "reg_1" });
    expect(transaction).toHaveBeenCalledTimes(1);
    // inserted with confirmed status + normalized lowercase guest email
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed", guestEmail: "jane@x.co", guestName: "Jane Guest" }));
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("confirms a logged-in member without requiring guest fields", async () => {
    asMember();
    const res = await POST(req({ eventId: "evt_1" }));
    expect(res.status).toBe(200);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed", contactId: "contact_1", organizationId: "org_1" }));
  });
});

describe("POST /api/events/register — capacity", () => {
  it("waitlists when the event is full and never charges", async () => {
    eventRow = publishedEvent({ maxCapacity: 10, registrationCount: 10 });
    const res = await POST(req({ eventId: "evt_1", guestName: "A", guestEmail: "a@b.co" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "waitlisted", registrationId: "reg_1" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ status: "waitlisted" }));
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});

describe("POST /api/events/register — paid", () => {
  it("creates a pending registration + Checkout with server-derived amount and metadata (member)", async () => {
    asMember();
    ticketRow = { id: "tk_1", name: "Member Rate", priceCents: 5000, stripePriceId: null, maxQuantity: null, soldCount: 0, isMemberOnly: false };
    const res = await POST(req({ eventId: "evt_1", ticketId: "tk_1", quantity: 2 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_1", registrationId: "reg_1" });

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ status: "pending", amountCents: 10000, quantity: 2 }));
    expect(ensureStripeCustomer).toHaveBeenCalledTimes(1);

    const args = sessionsCreate.mock.calls[0][0];
    expect(args.customer).toBe("cus_test_123");
    expect(args.line_items[0].price_data?.unit_amount).toBe(5000); // per-unit, from the ticket
    expect(args.line_items[0].quantity).toBe(2);
    expect(args.payment_intent_data.metadata).toEqual({ registrationId: "reg_1", eventId: "evt_1" });
    expect(args.metadata).toEqual({ registrationId: "reg_1", eventId: "evt_1" });
  });

  it("uses customer_email for a guest paid registration", async () => {
    ticketRow = { id: "tk_1", name: "Non-Member", priceCents: 7500, stripePriceId: null, maxQuantity: null, soldCount: 0, isMemberOnly: false };
    const res = await POST(req({ eventId: "evt_1", ticketId: "tk_1", guestName: "Pat", guestEmail: "pat@x.co" }));
    expect(res.status).toBe(200);
    expect(ensureStripeCustomer).not.toHaveBeenCalled();
    const args = sessionsCreate.mock.calls[0][0];
    expect(args.customer).toBeUndefined();
    expect(args.customer_email).toBe("pat@x.co");
  });

  it("prefers a configured stripePriceId over inline price_data", async () => {
    asMember();
    ticketRow = { id: "tk_1", name: "Member Rate", priceCents: 5000, stripePriceId: "price_abc", maxQuantity: null, soldCount: 0, isMemberOnly: false };
    await POST(req({ eventId: "evt_1", ticketId: "tk_1" }));
    const args = sessionsCreate.mock.calls[0][0];
    expect(args.line_items[0].price).toBe("price_abc");
    expect(args.line_items[0].price_data).toBeUndefined();
  });

  it("400s when the ticket is sold out", async () => {
    ticketRow = { id: "tk_1", name: "Limited", priceCents: 5000, stripePriceId: null, maxQuantity: 10, soldCount: 10, isMemberOnly: false };
    const res = await POST(req({ eventId: "evt_1", ticketId: "tk_1", guestName: "A", guestEmail: "a@b.co" }));
    expect(res.status).toBe(400);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("cleans up the pending registration and 500s when Checkout creation fails", async () => {
    asMember();
    ticketRow = { id: "tk_1", name: "Member Rate", priceCents: 5000, stripePriceId: null, maxQuantity: null, soldCount: 0, isMemberOnly: false };
    sessionsCreate.mockRejectedValueOnce(new Error("stripe down"));
    const res = await POST(req({ eventId: "evt_1", ticketId: "tk_1" }));
    expect(res.status).toBe(500);
    expect(del).toHaveBeenCalledTimes(1); // orphaned pending row deleted
  });

  it("uses a validated returnSlug for redirects and falls back on a bad one", async () => {
    asMember();
    ticketRow = { id: "tk_1", name: "Member Rate", priceCents: 5000, stripePriceId: null, maxQuantity: null, soldCount: 0, isMemberOnly: false };

    await POST(req({ eventId: "evt_1", ticketId: "tk_1", returnSlug: "eggs-expertise-canva-101" }));
    expect(sessionsCreate.mock.calls[0][0].success_url).toContain(
      "/events/eggs-expertise-canva-101?registered=1",
    );

    sessionsCreate.mockClear();
    await POST(req({ eventId: "evt_1", ticketId: "tk_1", returnSlug: "../evil?x=1" }));
    // not a plain slug → falls back to the DB event slug (publishedEvent = "biz-lunch")
    expect(sessionsCreate.mock.calls[0][0].success_url).toContain(
      "/events/biz-lunch?registered=1",
    );
  });
});

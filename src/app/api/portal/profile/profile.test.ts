import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { contacts, organizations } from "@/lib/db/schema";

// ── Mocks ─────────────────────────────────────────────────────────────────────
//
// Mirrors checkout.test.ts: we mock the cookie store + session verifier so we
// control the "logged-in" member, the rate limiter (pass-through), and the db so
// no real Postgres/crypto is touched. The schema table objects are imported real
// so we can assert WHICH table the route updated.

const SESSION = {
  contactId: "contact_1",
  organizationId: "org_1",
  exp: Date.now() + 60_000,
};

const cookieGet = vi.fn(() => ({ value: "fake-token" }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const verifyPortalSession = vi.fn(async () => SESSION as typeof SESSION | null);
vi.mock("@/lib/portal-session", () => ({
  PORTAL_COOKIE: "portal_session",
  verifyPortalSession,
}));

// Rate limiter: always allow, deterministic (don't depend on the in-memory window).
vi.mock("@/lib/rate-limit", () => ({
  limitPortalProfile: vi.fn(async () => null),
}));

// db.select(...).from(...).where(...).limit(...) → the authz read for isPrimaryContact.
let primaryRow: { isPrimaryContact: boolean } | undefined;
const limit = vi.fn(async () => (primaryRow ? [primaryRow] : []));
const selWhere = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where: selWhere }));
const select = vi.fn(() => ({ from }));

// db.transaction((tx) => …) where tx.update(...).set(...).where(...) are spies.
const updateWhere = vi.fn(async () => undefined);
const set = vi.fn((_values: Record<string, unknown>) => ({ where: updateWhere }));
const update = vi.fn((_table: unknown) => ({ set }));
const transaction = vi.fn(
  async (fn: (tx: { update: typeof update }) => Promise<void>) => {
    await fn({ update });
  },
);

vi.mock("@/lib/db", () => ({ db: { select, transaction, update } }));

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  POST = (await import("./route")).POST;
});

afterEach(() => {
  primaryRow = undefined;
  vi.clearAllMocks();
  cookieGet.mockReturnValue({ value: "fake-token" });
  verifyPortalSession.mockResolvedValue(SESSION);
});

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/portal/profile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/portal/profile — auth & validation", () => {
  it("401s when there is no valid session and never writes", async () => {
    verifyPortalSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ firstName: "X" }));
    expect(res.status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("400s on a non-JSON body", async () => {
    const req = new Request("http://localhost/api/portal/profile", {
      method: "POST",
      body: "not json{",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("400s (no editable fields) and IGNORES non-whitelisted keys — no write, no authz read", async () => {
    const res = await POST(
      makeRequest({
        status: "active",
        membershipTier: "community_investor",
        isPrimaryContact: true,
        id: "evil",
        organizationId: "someone_else",
        stripeCustomerId: "cus_evil",
      }),
    );
    expect(res.status).toBe(400);
    expect(select).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("400s when first name is blank", async () => {
    const res = await POST(makeRequest({ firstName: "   " }));
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("POST /api/portal/profile — contact self-edit", () => {
  it("updates the member's OWN contact and never reads the org-authz flag", async () => {
    const res = await POST(
      makeRequest({ firstName: "Jane", lastName: "Doe", title: "" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()) as { ok?: boolean }).toEqual({ ok: true });

    // contact-only → no org authz read
    expect(select).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(contacts);

    const setArg = set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).toMatchObject({ firstName: "Jane", lastName: "Doe", title: null });
  });

  it("cannot mass-assign privileged columns through a contact edit", async () => {
    const res = await POST(
      makeRequest({ firstName: "X", isPrimaryContact: true, status: "active" }),
    );
    expect(res.status).toBe(200);
    // Only firstName + the server-set updatedAt may reach the DB.
    const setArg = set.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(setArg).sort()).toEqual(["firstName", "updatedAt"]);
  });
});

describe("POST /api/portal/profile — org listing edit (primary-only)", () => {
  it("lets the PRIMARY contact update the org and normalizes the website URL", async () => {
    primaryRow = { isPrimaryContact: true };
    const res = await POST(
      makeRequest({ orgPhone: "330-555-1212", websiteUrl: "example.com" }),
    );
    expect(res.status).toBe(200);

    expect(select).toHaveBeenCalledTimes(1); // authz read happened
    expect(update).toHaveBeenCalledWith(organizations);

    const setArg = set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).toMatchObject({
      phone: "330-555-1212",
      websiteUrl: "https://example.com/",
    });
  });

  it("403s a NON-primary contact trying to edit org fields and writes nothing", async () => {
    primaryRow = { isPrimaryContact: false };
    const res = await POST(makeRequest({ orgPhone: "330-555-9999" }));
    expect(res.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("400s an invalid business email before any authz read or write", async () => {
    const res = await POST(makeRequest({ orgEmail: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(select).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a javascript: URL injected as a website", async () => {
    const res = await POST(makeRequest({ websiteUrl: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a javascript: social link but keeps a bare handle + https URL", async () => {
    // A scheme-bearing social value must be http(s) — blocks stored XSS into
    // the public directory's <a href>. Validated before the authz read.
    const bad = await POST(
      makeRequest({ facebook: "javascript:alert(document.cookie)" }),
    );
    expect(bad.status).toBe(400);
    expect(select).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();

    // A bare handle (no scheme) and a full https URL both pass through.
    primaryRow = { isPrimaryContact: true };
    const ok = await POST(
      makeRequest({
        facebook: "@medinachamber",
        instagram: "https://instagram.com/medinachamber",
      }),
    );
    expect(ok.status).toBe(200);
    const setArg = set.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).toMatchObject({
      facebook: "@medinachamber",
      instagram: "https://instagram.com/medinachamber",
    });
  });
});

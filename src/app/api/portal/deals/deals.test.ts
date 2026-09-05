import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The dormant-backend guard 404s this route unless internal transactions are on;
// these tests exercise the submission path that runs once the flag is set.
vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");

const limitPortalProfile = vi.fn(async () => null as Response | null);
vi.mock("@/lib/rate-limit", () => ({ limitPortalProfile }));

let sessionVal: { contactId: string; organizationId: string; exp: number } | null;
const verifyPortalSession = vi.fn(async () => sessionVal);
vi.mock("@/lib/portal-session", () => ({ verifyPortalSession, PORTAL_COOKIE: "portal_session" }));

let cookieVal: { value: string } | undefined;
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => cookieVal })) }));

const insReturning = vi.fn(async () => [{ id: "d1" }]);
const insValues = vi.fn((_v: Record<string, unknown>) => ({ returning: insReturning }));
const insert = vi.fn(() => ({ values: insValues }));
vi.mock("@/lib/db", () => ({ db: { insert } }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionVal = { contactId: "ct1", organizationId: "o1", exp: 0 };
  cookieVal = { value: "tok" };
});

const post = (body: unknown) =>
  new Request("http://localhost/api/portal/deals", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/portal/deals", () => {
  it("401s without a portal session", async () => {
    cookieVal = undefined;
    const res = await POST(post({ title: "x", description: "y" }));
    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("400s when title or description is missing", async () => {
    expect((await POST(post({}))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("creates an UNAPPROVED deal owned by the session org (never the body)", async () => {
    const res = await POST(post({ title: "20% off", description: "Great deal", organizationId: "EVIL" }));
    expect(res.status).toBe(201);
    const values = insValues.mock.calls[0][0];
    expect(values.organizationId).toBe("o1"); // session identity, not the spoofed body
    expect(values.isApproved).toBe(false); // pending staff moderation
    expect(values.title).toBe("20% off");
  });

  it("rejects a javascript: deal URL", async () => {
    const res = await POST(post({ title: "x", description: "y", dealUrl: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("POST /api/portal/deals — dormant backend", () => {
  it("404s before any hot_deals insert", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "");
    const res = await POST(post({ title: "20% off", description: "Great deal" }));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(verifyPortalSession).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");
  });
});

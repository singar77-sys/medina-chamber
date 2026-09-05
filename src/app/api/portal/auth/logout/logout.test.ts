import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// logout is the odd one out among the portal routes: it answers with a REDIRECT,
// not JSON, and it WRITES (it bumps contacts.session_epoch to revoke every
// outstanding session). Pre-cutover it was reachable unauthenticated, so the
// dormant-portal gate has to land before that write while leaving the redirect
// contract intact once the switch is on.

const cookieVal: { value: string } | undefined = { value: "tok" };
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => cookieVal })) }));

const verifyPortalSession = vi.fn(async () => ({
  contactId: "ct1",
  organizationId: "o1",
  exp: 0,
}));
vi.mock("@/lib/portal-session", () => ({
  verifyPortalSession,
  PORTAL_COOKIE: "portal_session",
}));

const updWhere = vi.fn(async () => undefined);
const set = vi.fn(() => ({ where: updWhere }));
const update = vi.fn(() => ({ set }));
vi.mock("@/lib/db", () => ({ db: { update } }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
});

const post = () =>
  POST(new Request("https://medinaohchamber.com/api/portal/auth/logout", { method: "POST" }));

describe("POST /api/portal/auth/logout — dormant backend", () => {
  it("404s with JSON before the session_epoch bump", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "");
    const res = await post();

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(verifyPortalSession).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not redirect while dormant — a 3xx would advertise a live /portal", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "");
    const res = await post();

    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("keeps the redirect + cookie-clear contract once the switch is 'true'", async () => {
    // Without this the 404 assertions above would still pass against a route
    // that had simply lost its redirect.
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");
    const res = await post();

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.headers.get("location")).toContain("/portal");
    expect(res.headers.get("set-cookie")).toContain("portal_session=");
    expect(update).toHaveBeenCalledTimes(1);
  });
});

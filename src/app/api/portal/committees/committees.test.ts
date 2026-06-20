import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const limitPortalProfile = vi.fn(async () => null as Response | null);
vi.mock("@/lib/rate-limit", () => ({ limitPortalProfile }));

let sessionVal: { contactId: string; organizationId: string; exp: number } | null;
const verifyPortalSession = vi.fn(async () => sessionVal);
vi.mock("@/lib/portal-session", () => ({ verifyPortalSession, PORTAL_COOKIE: "portal_session" }));

let cookieVal: { value: string } | undefined;
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: () => cookieVal })) }));

const joinCommittee = vi.fn(async () => true);
const leaveCommittee = vi.fn(async () => true);
vi.mock("@/lib/committees", () => ({ joinCommittee, leaveCommittee }));

let committeeRow: { id: string } | undefined;
const limit = vi.fn(async () => (committeeRow ? [committeeRow] : []));
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  sessionVal = { contactId: "ct1", organizationId: "o1", exp: 0 };
  cookieVal = { value: "tok" };
  committeeRow = { id: "c1" };
});

const post = (body: unknown) =>
  new Request("http://localhost/api/portal/committees", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/portal/committees", () => {
  it("401s when there is no portal session", async () => {
    cookieVal = undefined;
    const res = await POST(post({ committeeId: "c1", join: true }));
    expect(res.status).toBe(401);
    expect(joinCommittee).not.toHaveBeenCalled();
  });

  it("joins using the SESSION identity, never the body", async () => {
    const res = await POST(post({ committeeId: "c1", join: true, organizationId: "EVIL", contactId: "EVIL" }));
    expect(res.status).toBe(200);
    // identity args come from the verified session, not the spoofed body
    expect(joinCommittee).toHaveBeenCalledWith(expect.anything(), "c1", "o1", "ct1");
  });

  it("404s a join for a non-public / inactive committee (the self-join gate)", async () => {
    committeeRow = undefined; // the public+active lookup found nothing
    const res = await POST(post({ committeeId: "c1", join: true }));
    expect(res.status).toBe(404);
    expect(joinCommittee).not.toHaveBeenCalled();
  });

  it("leaves without the public gate", async () => {
    const res = await POST(post({ committeeId: "c1", join: false }));
    expect(res.status).toBe(200);
    expect(leaveCommittee).toHaveBeenCalledWith(expect.anything(), "c1", "o1");
    expect(select).not.toHaveBeenCalled(); // no committee lookup on leave
  });
});

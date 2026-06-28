import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { applyRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/rate-limit", () => ({
  applyRateLimit: vi.fn(async () => null),
  emailUnsubscribeLimiter: {},
}));
const mockedApplyRateLimit = vi.mocked(applyRateLimit);

const verifyUnsubscribeToken = vi.fn<(t: string) => string | null>(() => "contact-1");
vi.mock("@/lib/email/unsubscribe-token", () => ({ verifyUnsubscribeToken }));

// db: update(contacts).returning() (flip), select(latest send), update(send), update(campaign)
let flipRows: { id: string }[] = [{ id: "contact-1" }];
let latestSend: { id: string; campaignId: string } | undefined = { id: "send-9", campaignId: "camp-9" };

const updReturning = vi.fn(async () => flipRows);
const updWhere = vi.fn(() => ({
  returning: updReturning,
  then: (res: (v: undefined) => unknown) => Promise.resolve(undefined).then(res),
}));
const updSet = vi.fn(() => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));

const selLimit = vi.fn(async () => (latestSend ? [latestSend] : []));
const selOrderBy = vi.fn(() => ({ limit: selLimit }));
const selWhere = vi.fn(() => ({ orderBy: selOrderBy }));
const selFrom = vi.fn(() => ({ where: selWhere }));
const select = vi.fn(() => ({ from: selFrom }));

vi.mock("@/lib/db", () => ({ db: { update, select } }));

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ GET, POST } = await import("./route"));
});

afterEach(() => {
  vi.clearAllMocks();
  verifyUnsubscribeToken.mockReturnValue("contact-1");
  flipRows = [{ id: "contact-1" }];
  latestSend = { id: "send-9", campaignId: "camp-9" };
});

const req = (token: string, method = "GET") =>
  new Request(`http://localhost/api/email/unsubscribe?token=${token}`, { method });

describe("unsubscribe", () => {
  it("GET with a valid token shows the confirm page and does NOT mutate (prefetch-safe)", async () => {
    const res = await GET(req("good"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(update).not.toHaveBeenCalled(); // GET never unsubscribes — the POST does
  });

  it("GET with an invalid token returns 400 and never writes", async () => {
    verifyUnsubscribeToken.mockReturnValue(null);
    const res = await GET(req("bad"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("POST unsubscribes + attributes the campaign (200 html, 3 updates)", async () => {
    const res = await POST(req("good", "POST"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    // contact flip + send mark + campaign increment = 3 updates
    expect(update).toHaveBeenCalledTimes(3);
  });

  it("POST is idempotent: an already-unsubscribed contact doesn't re-increment", async () => {
    flipRows = []; // the conditional flip matched nothing (already unsubscribed)
    const res = await POST(req("good", "POST"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1); // only the (no-op) contact update; no send/campaign writes
  });

  it("GET 429s when rate limited, before verifying the token or touching the DB", async () => {
    mockedApplyRateLimit.mockResolvedValueOnce(
      new Response("Too many requests, please slow down.", { status: 429 }),
    );
    const res = await GET(req("good"));
    expect(res.status).toBe(429);
    expect(verifyUnsubscribeToken).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("POST 429s when rate limited, before verifying the token or touching the DB", async () => {
    mockedApplyRateLimit.mockResolvedValueOnce(
      new Response("Too many requests, please slow down.", { status: 429 }),
    );
    const res = await POST(req("good", "POST"));
    expect(res.status).toBe(429);
    expect(verifyUnsubscribeToken).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});

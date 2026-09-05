import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn<(req: Request) => Promise<Response | null>>(async () => null);
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

let createdCampaign: Record<string, unknown>;
const insReturning = vi.fn(async () => [createdCampaign]);
const insValues = vi.fn((_v: Record<string, unknown>) => ({ returning: insReturning }));
const insert = vi.fn(() => ({ values: insValues }));
const selOrderBy = vi.fn(async () => []);
const selFrom = vi.fn(() => ({ orderBy: selOrderBy }));
const select = vi.fn((_projection?: unknown) => ({ from: selFrom }));
vi.mock("@/lib/db", () => ({ db: { insert, select } }));

// Not mocked: @/lib/email is side-effect-safe to import (the Resend client is
// built with a placeholder key) and campaign-send is stubbed below, so these
// tests validate against the REAL EMAIL_RE the route ships with rather than a
// copy that can silently drift from it.

const sendCampaign = vi.fn(async () => ({ sent: 5, recipients: 5 }) as Record<string, unknown>);
vi.mock("@/lib/email/campaign-send", () => ({ sendCampaign }));

let createPost: (req: Request) => Promise<Response>;
let listGet: (req: Request) => Promise<Response>;
let sendPost: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
beforeAll(async () => {
  createPost = (await import("./route")).POST;
  listGet = (await import("./route")).GET;
  sendPost = (await import("./[id]/send/route")).POST;
});

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminSession.mockResolvedValue(null);
  createdCampaign = { id: "c1", status: "draft" };
  sendCampaign.mockResolvedValue({ sent: 5, recipients: 5 });
});

const post = (body: unknown) =>
  new Request("http://localhost/api/admin/campaigns", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/admin/campaigns (create)", () => {
  it("rejects unauthorized callers before touching the db", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await createPost(post({ name: "X", subject: "Y" }));
    expect(res.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it("400s when name or subject is missing", async () => {
    expect((await createPost(post({ subject: "Y" }))).status).toBe(400);
    expect((await createPost(post({ name: "X" }))).status).toBe(400);
  });

  it("400s on an invalid from email", async () => {
    const res = await createPost(post({ name: "X", subject: "Y", fromEmail: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("400s on a subject with line breaks or an over-length name (header safety)", async () => {
    expect((await createPost(post({ name: "X", subject: "Two\nLines" }))).status).toBe(400);
    expect((await createPost(post({ name: "n".repeat(200), subject: "Y" }))).status).toBe(400);
  });

  it("creates a draft with defaults applied", async () => {
    const res = await createPost(post({ name: "May News", subject: "Hello" }));
    expect(res.status).toBe(201);
    const values = insValues.mock.calls[0][0];
    expect(values.status).toBe("draft");
    expect(values.fromEmail).toContain("@");
    expect(values.name).toBe("May News");
  });
});

describe("GET /api/admin/campaigns (list)", () => {
  const get = () => new Request("http://localhost/api/admin/campaigns");

  it("rejects unauthorized callers before touching the db", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await listGet(get());
    expect(res.status).toBe(401);
    expect(select).not.toHaveBeenCalled();
  });

  it("surfaces a failedCount so a partially-failed blast isn't hidden as 'sent'", async () => {
    const res = await listGet(get());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ campaigns: [] });
    // the projection exposes failedCount derived from email_sends
    const projection = select.mock.calls[0][0] as Record<string, unknown>;
    expect(projection).toHaveProperty("failedCount");
  });
});

describe("POST /api/admin/campaigns/[id]/send", () => {
  const ctx = { params: Promise.resolve({ id: "c1" }) };
  const sendReq = () => new Request("http://localhost/api/admin/campaigns/c1/send", { method: "POST" });

  it("delegates to the send engine and returns the result", async () => {
    const res = await sendPost(sendReq(), ctx);
    expect(res.status).toBe(200);
    expect(sendCampaign).toHaveBeenCalledWith(expect.anything(), "c1");
    expect(await res.json()).toEqual({ result: { sent: 5, recipients: 5 } });
  });

  it("409s when the engine skips (already sent / no body)", async () => {
    sendCampaign.mockResolvedValue({ sent: 0, recipients: 0, skipped: "already sent" });
    const res = await sendPost(sendReq(), ctx);
    expect(res.status).toBe(409);
  });

  it("404s when the campaign doesn't exist", async () => {
    sendCampaign.mockRejectedValue(new Error("campaign not found: c1"));
    const res = await sendPost(sendReq(), ctx);
    expect(res.status).toBe(404);
  });
});

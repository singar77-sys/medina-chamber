import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminSession = vi.fn<(req: Request) => Promise<Response | null>>(async () => null);
vi.mock("@/lib/admin-auth", () => ({ requireAdminSession }));

// ── db mock ──────────────────────────────────────────────────────────────────
// Two select shapes share one chain, distinguished by their terminal call:
//   • the campaign read ends in .limit(1)  → resolves to [existing]
//   • the delivered count awaits .where()   → resolves to [{ delivered }]
let existing: { status: string; updatedAt: Date } | undefined;
let delivered = 0;
let resetRows: { id: string; status: string }[] = [];

const selLimit = vi.fn(async () => (existing ? [existing] : []));
const selWhere = vi.fn(() => ({
  limit: selLimit,
  then: (res: (v: { delivered: number }[]) => unknown) =>
    Promise.resolve([{ delivered }]).then(res),
}));
const selFrom = vi.fn(() => ({ where: selWhere }));
const select = vi.fn(() => ({ from: selFrom }));

const updReturning = vi.fn(async () => resetRows);
const updWhere = vi.fn(() => ({ returning: updReturning }));
const updSet = vi.fn((_v: Record<string, unknown>) => ({ where: updWhere }));
const update = vi.fn(() => ({ set: updSet }));

vi.mock("@/lib/db", () => ({ db: { select, update } }));

let POST: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST;
});

const ctx = { params: Promise.resolve({ id: "camp1" }) };
const req = () => new Request("http://localhost/api/admin/campaigns/camp1/reset", { method: "POST" });
const minsAgo = (m: number) => new Date(Date.now() - m * 60_000);

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminSession.mockResolvedValue(null);
  existing = { status: "sending", updatedAt: minsAgo(20) }; // stale by default
  delivered = 0;
  resetRows = [{ id: "camp1", status: "draft" }];
});

describe("POST /api/admin/campaigns/[id]/reset", () => {
  it("rejects unauthorized callers before touching the db", async () => {
    requireAdminSession.mockResolvedValue(Response.json({ error: "no" }, { status: 401 }));
    const res = await POST(req(), ctx);
    expect(res.status).toBe(401);
    expect(select).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("404s when the campaign doesn't exist", async () => {
    existing = undefined;
    const res = await POST(req(), ctx);
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("409s when the campaign isn't in 'sending' (nothing to recover)", async () => {
    existing = { status: "draft", updatedAt: minsAgo(20) };
    const res = await POST(req(), ctx);
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  // ── the time guard ──────────────────────────────────────────────────────────
  it("refuses to reset a campaign that has only just started sending (time guard)", async () => {
    existing = { status: "sending", updatedAt: new Date() }; // claimed seconds ago
    const res = await POST(req(), ctx);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/in flight/i);
    expect(update).not.toHaveBeenCalled(); // never races a live send
  });

  it("resets a stale send that reached nobody back to 'draft'", async () => {
    delivered = 0;
    resetRows = [{ id: "camp1", status: "draft" }];
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledTimes(1);
    expect(updSet.mock.calls[0][0].status).toBe("draft");
    expect(await res.json()).toEqual({ reset: { id: "camp1", status: "draft", delivered: 0 } });
  });

  // ── the no-double-send guarantee ──────────────────────────────────────────────
  it("never returns a partially-delivered send to a re-sendable state", async () => {
    delivered = 3; // three recipients already got it
    resetRows = [{ id: "camp1", status: "sent_with_errors" }];
    const res = await POST(req(), ctx);
    expect(res.status).toBe(200);

    const set = updSet.mock.calls[0][0];
    expect(set.status).toBe("sent_with_errors"); // terminal, NOT "draft"
    expect(set.status).not.toBe("draft");
    expect(set.sentCount).toBe(3); // sentCount reconciled to what actually went out
    expect((await res.json()).reset.status).toBe("sent_with_errors");
  });

  it("counts non-'failed' rows (incl. queued) as delivered — conservative", async () => {
    // Even a single ambiguous row keeps the campaign out of the re-send path.
    delivered = 1;
    resetRows = [{ id: "camp1", status: "sent_with_errors" }];
    await POST(req(), ctx);
    expect(updSet.mock.calls[0][0].status).toBe("sent_with_errors");
  });

  it("409s when the atomic update is lost to a send that just finished", async () => {
    resetRows = []; // WHERE status='sending' matched nothing — it flipped to 'sent' first
    const res = await POST(req(), ctx);
    expect(res.status).toBe(409);
  });
});

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { signSession } from "@/lib/admin-session";

// Use the REAL requireAdminSession so auth enforcement is actually tested. Stub the
// expected token (signSession/verifySession need it; must be >= 16 chars or the guard 503s).
const TOKEN = "test-admin-token-1234567890";
vi.stubEnv("CHAT_ADMIN_TOKEN", TOKEN);

// signSession is async and needs the env stubbed first, so it's resolved in beforeAll.
let COOKIE: string;

// Unified db mock. Per-test, set `selectRows` (the single SELECT a route runs)
// and `returningRows` (the INSERT/UPDATE/DELETE ... RETURNING result).
let selectRows: unknown[] = [];
let returningRows: unknown[] = [];

function selResult() {
  return {
    limit: async () => selectRows,
    then: (res: (v: unknown[]) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(selectRows).then(res, rej),
  };
}
const where = vi.fn(() => selResult());
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));

const returning = vi.fn(async () => returningRows);
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));
const updWhere = vi.fn(() => ({ returning }));
const set = vi.fn(() => ({ where: updWhere }));
const update = vi.fn(() => ({ set }));
const delWhere = vi.fn(() => ({ returning }));
const del = vi.fn(() => ({ where: delWhere }));

vi.mock("@/lib/db", () => ({ db: { select, insert, update, delete: del } }));

let createTicket: (req: Request, ctx: Ctx) => Promise<Response>;
let patchTicket: (req: Request, ctx: Ctx) => Promise<Response>;
let deleteTicket: (req: Request, ctx: Ctx) => Promise<Response>;
let patchEvent: (req: Request, ctx: Ctx) => Promise<Response>;
let checkin: (req: Request, ctx: Ctx) => Promise<Response>;

type Ctx = { params: Promise<{ id: string }> };

beforeAll(async () => {
  COOKIE = await signSession();
  createTicket = (await import("./events/[id]/tickets/route")).POST;
  ({ PATCH: patchTicket, DELETE: deleteTicket } = await import("./tickets/[id]/route"));
  patchEvent = (await import("./events/[id]/route")).PATCH;
  checkin = (await import("./checkin/[id]/route")).POST;
});

afterEach(() => {
  vi.clearAllMocks();
  selectRows = [];
  returningRows = [];
});

function req(body: unknown, { auth = true, method = "POST" } = {}): Request {
  return new Request("http://localhost/api/admin/reg/x", {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth ? { cookie: `admin_session=${COOKIE}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
const P = (id: string): Ctx => ({ params: Promise.resolve({ id }) });

describe("admin reg API — auth", () => {
  it("401s every route without a session cookie", async () => {
    expect((await createTicket(req({}, { auth: false }), P("e1"))).status).toBe(401);
    expect((await patchTicket(req({}, { auth: false }), P("t1"))).status).toBe(401);
    expect((await deleteTicket(req({}, { auth: false, method: "DELETE" }), P("t1"))).status).toBe(401);
    expect((await patchEvent(req({}, { auth: false }), P("e1"))).status).toBe(401);
    expect((await checkin(req({}, { auth: false }), P("r1"))).status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("401s on a wrong token", async () => {
    const bad = new Request("http://localhost/x", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "admin_session=tampered.invalid" },
      body: "{}",
    });
    expect((await createTicket(bad, P("e1"))).status).toBe(401);
  });
});

describe("create ticket", () => {
  it("creates a ticket when the event exists", async () => {
    selectRows = [{ id: "e1" }]; // event lookup
    returningRows = [{ id: "tk1", name: "Member Rate", priceCents: 2500 }];
    const res = await createTicket(req({ name: "Member Rate", priceCents: 2500, isMemberOnly: true }), P("e1"));
    expect(res.status).toBe(201);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "e1", name: "Member Rate", priceCents: 2500, isMemberOnly: true }),
    );
  });

  it("400s a missing name or bad price", async () => {
    expect((await createTicket(req({ priceCents: 100 }), P("e1"))).status).toBe(400);
    expect((await createTicket(req({ name: "x", priceCents: -5 }), P("e1"))).status).toBe(400);
    expect((await createTicket(req({ name: "x", priceCents: 1.5 }), P("e1"))).status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("404s when the event does not exist", async () => {
    selectRows = [];
    const res = await createTicket(req({ name: "x", priceCents: 0 }), P("missing"));
    expect(res.status).toBe(404);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("edit / delete ticket", () => {
  it("patches whitelisted fields and 400s an empty patch", async () => {
    returningRows = [{ id: "tk1", priceCents: 3000 }];
    expect((await patchTicket(req({ priceCents: 3000 }, { method: "PATCH" }), P("tk1"))).status).toBe(200);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 3000 }));

    expect((await patchTicket(req({}, { method: "PATCH" }), P("tk1"))).status).toBe(400);
  });

  it("refuses to delete a ticket that has registrations", async () => {
    selectRows = [{ count: 3 }];
    const res = await deleteTicket(req({}, { method: "DELETE" }), P("tk1"));
    expect(res.status).toBe(409);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes a ticket with no registrations", async () => {
    selectRows = [{ count: 0 }];
    returningRows = [{ id: "tk1" }];
    const res = await deleteTicket(req({}, { method: "DELETE" }), P("tk1"));
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledTimes(1);
  });
});

describe("patch event (publish / capacity)", () => {
  it("publishes and sets capacity", async () => {
    returningRows = [{ id: "e1", status: "published", maxCapacity: 50 }];
    const res = await patchEvent(req({ status: "published", maxCapacity: 50 }, { method: "PATCH" }), P("e1"));
    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "published", maxCapacity: 50 }));
  });

  it("400s an invalid status", async () => {
    expect((await patchEvent(req({ status: "live" }, { method: "PATCH" }), P("e1"))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("check-in", () => {
  it("checks in a confirmed registration → attended", async () => {
    selectRows = [{ id: "r1", status: "confirmed" }];
    returningRows = [{ id: "r1", status: "attended" }];
    const res = await checkin(req({ checkedIn: true }), P("r1"));
    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "attended" }));
  });

  it("409s checking in a non-confirmed (e.g. waitlisted) registration", async () => {
    selectRows = [{ id: "r1", status: "waitlisted" }];
    const res = await checkin(req({ checkedIn: true }), P("r1"));
    expect(res.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
  });

  it("400s without a boolean checkedIn", async () => {
    expect((await checkin(req({}), P("r1"))).status).toBe(400);
  });
});

import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { events, eventTickets } from "@/lib/db/schema";

// db.select(...).from(events).where(...)                    → candidate rows (no limit)
// db.select(...).from(eventTickets).where(...).orderBy(...) → ticket rows
let candidates: Record<string, unknown>[];
let ticketRows: Record<string, unknown>[];
let lastFrom: unknown;

const eventsWhere = vi.fn(async () => candidates);
const orderBy = vi.fn(async () => ticketRows);
const ticketWhere = vi.fn(() => ({ orderBy }));
const from = vi.fn((tbl: unknown) => {
  lastFrom = tbl;
  return tbl === events ? { where: eventsWhere } : { where: ticketWhere };
});
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

let getRegisterableEvent: typeof import("./db-events").getRegisterableEvent;
let registrationIsOpen: typeof import("./db-events").registrationIsOpen;
let seatsLeft: typeof import("./db-events").seatsLeft;

beforeAll(async () => {
  ({ getRegisterableEvent, registrationIsOpen, seatsLeft } = await import("./db-events"));
});

// Match the impl: event date is the UTC calendar date (import stores midnight UTC).
const FUTURE = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const FUTURE_ISO = FUTURE.toISOString().slice(0, 10);

function evt(over: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    slug: "biz-2026",
    title: "Biz",
    isMembersOnly: false,
    startsAt: FUTURE,
    location: "Hall",
    maxCapacity: 100,
    registrationCount: 0,
    registrationOpenAt: null,
    registrationCloseAt: null,
    ...over,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  candidates = [];
  ticketRows = [];
  lastFrom = undefined;
});

describe("getRegisterableEvent (matches by title + date)", () => {
  it("returns null when no published event matches the title", async () => {
    candidates = [];
    expect(await getRegisterableEvent("Biz", FUTURE_ISO)).toBeNull();
  });

  it("returns null when the title matches but the date does not", async () => {
    candidates = [evt()];
    expect(await getRegisterableEvent("Biz", "1999-01-01")).toBeNull();
  });

  it("returns null when the event matches but has no tickets", async () => {
    candidates = [evt()];
    ticketRows = [];
    expect(await getRegisterableEvent("Biz", FUTURE_ISO)).toBeNull();
  });

  it("returns the event + tickets on a title+date match", async () => {
    candidates = [evt()];
    ticketRows = [
      { id: "t1", name: "GA", description: null, priceCents: 0, isMemberOnly: false, maxQuantity: null, soldCount: 0 },
    ];
    const r = await getRegisterableEvent("Biz", FUTURE_ISO);
    expect(r?.id).toBe("evt_1");
    expect(r?.tickets).toHaveLength(1);
    expect(lastFrom).toBe(eventTickets);
  });

  it("disambiguates same-title events by date", async () => {
    const other = evt({ id: "evt_other", startsAt: new Date("1999-01-01T15:00:00Z") });
    candidates = [other, evt()]; // two "Biz" events on different dates
    ticketRows = [
      { id: "t1", name: "GA", description: null, priceCents: 0, isMemberOnly: false, maxQuantity: null, soldCount: 0 },
    ];
    const r = await getRegisterableEvent("Biz", FUTURE_ISO);
    expect(r?.id).toBe("evt_1"); // the one whose date matches
  });
});

describe("registrationIsOpen", () => {
  it("is open for a future event with no window", () => {
    expect(registrationIsOpen(evt() as never)).toBe(true);
  });
  it("is closed before the open time and after the close time", () => {
    expect(registrationIsOpen(evt({ registrationOpenAt: FUTURE }) as never)).toBe(false);
    expect(registrationIsOpen(evt({ registrationCloseAt: new Date(Date.now() - 1000) }) as never)).toBe(false);
  });
  it("is closed once the event's day has fully passed", () => {
    // >24h ago — past the date-only start-day tolerance.
    expect(registrationIsOpen(evt({ startsAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }) as never)).toBe(false);
  });
  it("stays open on the day of a date-only (midnight-UTC) event", () => {
    // midnight UTC today is ~8pm ET yesterday — must NOT read as already started.
    const todayMidnightUTC = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    expect(registrationIsOpen(evt({ startsAt: todayMidnightUTC }) as never)).toBe(true);
  });
});

describe("seatsLeft", () => {
  it("is null when uncapped, else clamped remaining", () => {
    expect(seatsLeft(evt({ maxCapacity: null }) as never)).toBeNull();
    expect(seatsLeft(evt({ maxCapacity: 10, registrationCount: 7 }) as never)).toBe(3);
    expect(seatsLeft(evt({ maxCapacity: 10, registrationCount: 12 }) as never)).toBe(0);
  });
});

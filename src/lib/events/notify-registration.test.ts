import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { eventRegistrations, events, eventTickets, contacts } from "@/lib/db/schema";

// db.select(...).from(<table>).where(...).limit(1) → rows[table], dispatched by table.
let rows: {
  reg?: Record<string, unknown>;
  event?: Record<string, unknown>;
  ticket?: Record<string, unknown>;
  contact?: Record<string, unknown>;
};
let lastFrom: unknown;

const limit = vi.fn(async () => {
  if (lastFrom === eventRegistrations) return rows.reg ? [rows.reg] : [];
  if (lastFrom === events) return rows.event ? [rows.event] : [];
  if (lastFrom === eventTickets) return rows.ticket ? [rows.ticket] : [];
  if (lastFrom === contacts) return rows.contact ? [rows.contact] : [];
  return [];
});
const where = vi.fn(() => ({ limit }));
const from = vi.fn((t: unknown) => {
  lastFrom = t;
  return { where };
});
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));

vi.mock("@/data/events", () => ({
  events: [
    {
      title: "Biz Lunch",
      dateISO: "2026-06-23",
      slug: "biz-lunch",
      dayOfWeek: "Tuesday",
      month: "June",
      day: 23,
      year: 2026,
      startTime: "9:00 AM",
    },
  ],
}));

const send = vi.fn(async (_p: Record<string, unknown>) => {});
vi.mock("./event-emails", () => ({ sendEventConfirmation: send }));

let notifyRegistration: typeof import("./notify-registration").notifyRegistration;
beforeAll(async () => {
  ({ notifyRegistration } = await import("./notify-registration"));
});

const EVENT = { title: "Biz Lunch", startsAt: new Date("2026-06-23T00:00:00Z"), location: "Chamber Hall" };

afterEach(() => {
  vi.clearAllMocks();
  rows = {};
  lastFrom = undefined;
});

describe("notifyRegistration", () => {
  it("emails a confirmed member with their address + static-enriched when/URL", async () => {
    rows = {
      reg: { status: "confirmed", eventId: "e1", ticketId: "t1", contactId: "c1", guestName: null, guestEmail: null, quantity: 2, amountCents: 5000 },
      event: EVENT,
      ticket: { name: "Member Rate" },
      contact: { firstName: "Jane", lastName: "Doe", email: "jane@x.co" },
    };
    await notifyRegistration("reg_1");

    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toMatchObject({
      to: "jane@x.co",
      attendeeName: "Jane Doe",
      eventTitle: "Biz Lunch",
      ticketName: "Member Rate",
      quantity: 2,
      amountCents: 5000,
      status: "confirmed",
    });
    expect(arg.eventWhen).toContain("9:00 AM"); // enriched from the static event
    expect(arg.eventUrl).toContain("/events/biz-lunch");
  });

  it("emails a waitlisted guest at their address", async () => {
    rows = {
      reg: { status: "waitlisted", eventId: "e1", ticketId: null, contactId: null, guestName: "Pat Guest", guestEmail: "pat@x.co", quantity: 1, amountCents: 0 },
      event: EVENT,
    };
    await notifyRegistration("reg_2");

    const arg = send.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toMatchObject({ to: "pat@x.co", attendeeName: "Pat Guest", status: "waitlisted" });
  });

  it("does not email for a pending registration", async () => {
    rows = { reg: { status: "pending", eventId: "e1", contactId: null, guestEmail: "x@y.co", quantity: 1, amountCents: 0 }, event: EVENT };
    await notifyRegistration("reg_3");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not email a member with no address on file", async () => {
    rows = {
      reg: { status: "confirmed", eventId: "e1", ticketId: null, contactId: "c1", quantity: 1, amountCents: 0 },
      event: EVENT,
      contact: { firstName: "No", lastName: "Email", email: null },
    };
    await notifyRegistration("reg_4");
    expect(send).not.toHaveBeenCalled();
  });

  it("never throws when the registration is missing", async () => {
    rows = {};
    await expect(notifyRegistration("missing")).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});

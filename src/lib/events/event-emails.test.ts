import { afterEach, describe, expect, it, vi } from "vitest";

// vi.hoisted so the spy exists when the (hoisted) vi.mock factory closes over it.
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("@/lib/email", () => ({ resend: { emails: { send } } }));

import { buildEventConfirmationEmail, sendEventConfirmation } from "./event-emails";

afterEach(() => {
  vi.clearAllMocks();
});

const base = {
  to: "jane@x.co",
  attendeeName: "Jane Doe",
  eventTitle: "Annual Business Lunch",
  eventWhen: "Thursday, July 17, 2026 · 11:30 AM",
  location: "Chamber Hall",
  ticketName: "Member Rate",
  quantity: 2,
  amountCents: 10000,
  status: "confirmed" as const,
  eventUrl: "https://medinaohchamber.com/events/biz-lunch",
};

describe("buildEventConfirmationEmail", () => {
  it("renders a confirmed email with details, total, and CTA", () => {
    const html = buildEventConfirmationEmail(base);
    expect(html).toContain("You're registered!");
    expect(html).toContain("Annual Business Lunch");
    expect(html).toContain("Member Rate");
    expect(html).toContain("$100.00");
    expect(html).toContain("Quantity");
    expect(html).toContain("View Event Details");
    expect(html).toContain("https://medinaohchamber.com/events/biz-lunch");
  });

  it("shows Free for a zero-amount confirmation", () => {
    expect(buildEventConfirmationEmail({ ...base, amountCents: 0 })).toContain("Free");
  });

  it("renders a waitlist email with no total and waitlist copy", () => {
    const html = buildEventConfirmationEmail({ ...base, status: "waitlisted" });
    expect(html).toContain("You're on the waitlist");
    expect(html).toContain("no payment has been taken");
    expect(html).not.toContain("Total");
  });

  it("escapes HTML in attacker-controlled fields (name, title)", () => {
    const html = buildEventConfirmationEmail({
      ...base,
      attendeeName: "<script>alert(1)</script>",
      eventTitle: "A & B <b>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt;b&gt;");
  });

  it("omits optional rows when absent", () => {
    const html = buildEventConfirmationEmail({
      ...base,
      location: null,
      ticketName: null,
      quantity: 1,
      eventUrl: undefined,
    });
    expect(html).not.toContain("Where");
    expect(html).not.toContain("Ticket");
    expect(html).not.toContain("Quantity");
    expect(html).not.toContain("View Event Details");
  });
});

describe("sendEventConfirmation", () => {
  it("sends with a confirmed subject + recipient", async () => {
    await sendEventConfirmation(base);
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg.to).toBe("jane@x.co");
    expect(arg.subject).toBe("You're registered — Annual Business Lunch");
  });

  it("uses a waitlist subject for waitlisted registrations", async () => {
    await sendEventConfirmation({ ...base, status: "waitlisted" });
    expect(send.mock.calls[0][0].subject).toBe(
      "Waitlist confirmation — Annual Business Lunch",
    );
  });

  it("never throws when the send fails", async () => {
    send.mockRejectedValueOnce(new Error("resend down"));
    await expect(sendEventConfirmation(base)).resolves.toBeUndefined();
  });
});

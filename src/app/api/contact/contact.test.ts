import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// The contact form is one of only two things a visitor can actually submit
// before the GrowthZone cutover, yet the dormant join/sponsorship flows were the
// tested ones. Every branch here has a real-world failure mode: a broken
// honeypot floods the office inbox, a dropped escHtml puts attacker markup in
// staff email, and a swallowed Resend error shows "Message sent!" for a message
// that never existed.

const { limitContactForm, send, captureMessage, captureException } = vi.hoisted(() => ({
  limitContactForm: vi.fn(async () => null as Response | null),
  send: vi.fn(async (_payload: Record<string, unknown>) => ({
    error: null as { name: string; message: string } | null,
  })),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ limitContactForm }));
vi.mock("@sentry/nextjs", () => ({ captureMessage, captureException }));
// Real EMAIL_RE and CHAMBER_NOTIFY_EMAIL, stubbed transport only.
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  resend: { emails: { send } },
}));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST;
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  limitContactForm.mockResolvedValue(null);
  send.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://medinaohchamber.com/api/contact", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const valid = {
  firstName: "Ann",
  lastName: "Smith",
  email: "ann@acme.co",
  comments: "Interested in joining the chamber.",
  formLoadedAt: Date.now() - 5000, // filled in over MIN_FILL_MS ago
};

describe("POST /api/contact", () => {
  it("sends the notification for a valid submission, reply-to the visitor", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const sent = send.mock.calls[0][0] as unknown as Record<string, string>;
    expect(sent.replyTo).toBe("ann@acme.co");
    expect(sent.subject).toBe("Contact form: Ann Smith");
  });

  it("HTML-escapes visitor input in the staff email body", async () => {
    await post({ ...valid, comments: "<script>alert(1)</script>" });
    const sent = send.mock.calls[0][0] as unknown as Record<string, string>;
    expect(sent.html).toContain("&lt;script&gt;");
    expect(sent.html).not.toContain("<script>");
    // The plain-text part is not markup, so it keeps the raw value.
    expect(sent.text).toContain("<script>alert(1)</script>");
  });

  it("silently 200s a honeypot hit without sending anything", async () => {
    const res = await post({ ...valid, website_confirm: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalled();
  });

  it("silently 200s an instant (bot-speed) submission", async () => {
    const res = await post({ ...valid, formLoadedAt: Date.now() });
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("still sends when the visitor's clock runs ahead of the server's", async () => {
    // A negative fill time means a fast client clock, not a bot. Dropping this
    // allowance silently swallowed real messages behind a fake success.
    const res = await post({ ...valid, formLoadedAt: Date.now() + 60_000 });
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("400s on a missing required field or an invalid email", async () => {
    expect((await post({ ...valid, comments: "" })).status).toBe(400);
    expect((await post({ ...valid, firstName: "" })).status).toBe(400);
    expect((await post({ ...valid, email: "not-an-email" })).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("short-circuits on the rate limiter before parsing the body", async () => {
    limitContactForm.mockResolvedValue(Response.json({ error: "slow down" }, { status: 429 }));
    expect((await post(valid)).status).toBe(429);
    expect(send).not.toHaveBeenCalled();
  });

  it("413s an oversized body and 400s unparseable JSON", async () => {
    const huge = JSON.stringify({ ...valid, comments: "x".repeat(70_000) });
    expect((await post(huge)).status).toBe(413);
    expect((await post("{not json")).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("500s when the mail service is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await post(valid)).status).toBe(500);
    expect(send).not.toHaveBeenCalled();
  });

  it("500s when Resend resolves with an error instead of throwing", async () => {
    // The SDK does not throw on API failures; without this branch the visitor
    // saw "Message sent!" while no email existed.
    send.mockResolvedValue({ error: { name: "validation_error", message: "bad domain" } });
    const res = await post(valid);
    expect(res.status).toBe(500);
    expect(captureException).toHaveBeenCalled();
  });

  it("500s when the send throws", async () => {
    send.mockRejectedValue(new Error("network down"));
    expect((await post(valid)).status).toBe(500);
  });
});

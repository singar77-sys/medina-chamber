import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/apply is one of only two things a visitor can submit before the
 * GrowthZone cutover, and the only one that starts a membership conversation.
 * Every branch has a concrete failure mode:
 *   - a broken honeypot/timing tripwire floods the chamber inbox with bot spam;
 *   - a dropped escHtml puts attacker markup in staff email;
 *   - a missing body cap lets one request buffer and JSON.parse megabytes;
 *   - a swallowed Resend error tells an applicant "we got it" for an
 *     application that never existed.
 *
 * Real EMAIL_RE, real readJsonBounded, real sanitize helpers. Only the network
 * boundaries (Resend, the rate limiter, Sentry) are stubbed - no live calls.
 */

const { applyRateLimit, send, captureMessage, captureException } = vi.hoisted(() => ({
  applyRateLimit: vi.fn(async () => null as Response | null),
  send: vi.fn(async (_payload: Record<string, unknown>) => ({ id: "email_1" })),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({ applyRateLimit, formLimiter: {} }));
vi.mock("@sentry/nextjs", () => ({ captureMessage, captureException }));
// Real EMAIL_RE + CHAMBER_NOTIFY_EMAIL; only the transport is stubbed.
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  resend: { emails: { send } },
}));

let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  POST = (await import("./route")).POST as unknown as (req: Request) => Promise<Response>;
});

beforeEach(() => {
  vi.clearAllMocks();
  applyRateLimit.mockResolvedValue(null);
  send.mockResolvedValue({ id: "email_1" });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const VALID = {
  businessName: "Acme Co",
  contactName: "Ann Smith",
  email: "ann@acme.co",
  phone: "330-555-0100",
  employees: "2-5",
  formLoadedAt: Date.now() - 5000, // over MIN_FILL_MS ago
};

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return POST(
    new Request("https://medinaohchamber.com/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

/** The single Resend payload the route sent. */
function sentEmail(): Record<string, string> {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0] as unknown as Record<string, string>;
}

// -- Happy path ---------------------------------------------------------------

describe("POST /api/apply - successful application", () => {
  it("returns { success: true } and mails the chamber, reply-to the applicant", async () => {
    const res = await post(VALID);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const mail = sentEmail();
    expect(mail.to).toBe("office@medinaohchamber.com");
    // Staff hit reply and reach the applicant, not the sending domain.
    expect(mail.replyTo).toBe("ann@acme.co");
    expect(mail.subject).toBe("Membership Application, Acme Co");
    expect(mail.html).toContain("Acme Co");
    expect(mail.html).toContain("Ann Smith");
    expect(mail.html).toContain("330-555-0100");
    // Employee band is rendered as its human label, not the raw form value.
    expect(mail.html).toContain("2–5 employees");
  });

  it("accepts an application with only the required fields", async () => {
    const res = await post({
      businessName: "Solo LLC",
      contactName: "Pat",
      email: "pat@solo.co",
      phone: "3305550101",
      employees: "1",
    });
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("echoes an http(s) website as a link but never a javascript: payload", async () => {
    await post({ ...VALID, website: "https://acme.co" });
    expect(sentEmail().html).toContain('href="https://acme.co"');

    send.mockClear();
    await post({ ...VALID, website: "javascript:alert(1)" });
    const mail = sentEmail();
    expect(mail.html).not.toContain("javascript:");
    expect(mail.html).not.toContain("Website");
  });

  it("HTML-escapes applicant input in the staff email", async () => {
    // The staff inbox renders this HTML. Unescaped input is stored XSS aimed at
    // chamber employees.
    await post({ ...VALID, businessName: `<script>alert(1)</script>`, contactName: `O'Brien "Bob"` });
    const html = sentEmail().html;
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&#39;");
    expect(html).toContain("&quot;");
  });
});

// -- Body validation ----------------------------------------------------------

describe("POST /api/apply - invalid or missing body", () => {
  it("400s on unparseable JSON without sending anything", async () => {
    const res = await post("}{ not json");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["null", "null"],
    ["a bare string", `"just a string"`],
    ["a number", "42"],
    ["a boolean", "true"],
  ])("400s when the body is %s", async (_label, raw) => {
    const res = await post(raw);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request body." });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["businessName", "contactName", "email", "phone", "employees"])(
    "400s when the required field %s is missing",
    async (field) => {
      const body: Record<string, unknown> = { ...VALID };
      delete body[field];
      const res = await post(body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Required fields missing." });
      expect(send).not.toHaveBeenCalled();
    },
  );

  it("treats a whitespace-only required field as missing", async () => {
    const res = await post({ ...VALID, contactName: "   " });
    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a required field that blows its length cap rather than truncating it", async () => {
    // pickString returns null past the cap, so an over-long value fails the
    // required-fields check instead of silently shipping a truncated business
    // name into the chamber's records.
    const res = await post({ ...VALID, businessName: "x".repeat(201) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Required fields missing." });
  });

  it.each([
    "nope",
    "no-at-sign.com",
    "two@@at.co",
    "spaces in@email.co",
    "no@tld",
    "@nolocal.co",
  ])("400s on the invalid email %s", async (email) => {
    // Uses the REAL EMAIL_RE from @/lib/email, so this test tracks the shipped
    // validator instead of a copy of it.
    const res = await post({ ...VALID, email });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Please enter a valid email address." });
    expect(send).not.toHaveBeenCalled();
  });
});

// -- 64KB body cap ------------------------------------------------------------

describe("POST /api/apply - body size cap (readJsonBounded)", () => {
  it("413s a body over 64K characters", async () => {
    // Under the declared-content-length fast path (64K * 4) but over the
    // post-read character cap, so this exercises the second check.
    const res = await post({ ...VALID, notes: "x".repeat(70_000) });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Request body too large." });
    expect(send).not.toHaveBeenCalled();
  });

  it("413s on a declared Content-Length over the ceiling before reading the body", async () => {
    // The point of the fast path: a lying/huge Content-Length is refused
    // without buffering or JSON.parse'ing anything.
    const res = await POST(
      new Request("https://medinaohchamber.com/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": "999999999" },
        body: JSON.stringify(VALID),
      }),
    );
    expect(res.status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts a large-but-legal application (a 5,000-char notes field)", async () => {
    // The cap is ~10x the largest legitimate submission; a real applicant
    // filling the notes box must never be refused.
    const res = await post({ ...VALID, notes: "y".repeat(5_000) });
    expect(res.status).toBe(200);
    expect(sentEmail().html).toContain("yyyy");
  });
});

// -- Rate limiting ------------------------------------------------------------

describe("POST /api/apply - rate limiting", () => {
  it("returns the limiter's 429 and never reads the body or sends mail", async () => {
    applyRateLimit.mockResolvedValue(
      new Response("Too many requests, please slow down.", { status: 429 }),
    );
    const res = await post(VALID);
    expect(res.status).toBe(429);
    expect(send).not.toHaveBeenCalled();
  });

  it("runs the limiter before anything else, even for a garbage body", async () => {
    applyRateLimit.mockResolvedValue(new Response("nope", { status: 429 }));
    const res = await post("}{");
    // A 400 here would mean an attacker can burn parse cycles past the limiter.
    expect(res.status).toBe(429);
  });
});

// -- Bot tripwires ------------------------------------------------------------

describe("POST /api/apply - honeypot and timing tripwires", () => {
  it("returns 200 but sends nothing when the honeypot field is filled", async () => {
    // 200 on purpose: a 4xx tells the bot to adjust and try again.
    const res = await post({ ...VALID, website_confirm: "http://spam.example" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(send).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalledWith(
      "apply form rejected by honeypot/timing",
      expect.objectContaining({ tags: { route: "apply", phase: "honeypot" } }),
    );
  });

  it("returns 200 but sends nothing for a sub-1.5s fill time", async () => {
    const res = await post({ ...VALID, formLoadedAt: Date.now() - 100 });
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("still sends when the visitor's clock runs ahead of the server", async () => {
    // A negative gap means device-clock skew, not a bot. Treating it as a bot
    // silently drops real applications from anyone with a fast clock.
    const res = await post({ ...VALID, formLoadedAt: Date.now() + 60_000 });
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("still sends when the form never reported a load time", async () => {
    const body: Record<string, unknown> = { ...VALID };
    delete body.formLoadedAt;
    await post(body);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

// -- Transport failure --------------------------------------------------------

describe("POST /api/apply - Resend failure", () => {
  it("500s instead of reporting success when the send throws", async () => {
    // Returning { success: true } here would tell an applicant the chamber has
    // their application when nothing was ever delivered.
    send.mockRejectedValue(new Error("resend down"));
    const res = await post(VALID);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong. Please try again." });
  });

  it("reports the failure to Sentry with NO applicant PII attached", async () => {
    // sentry.server.config.ts sets sendDefaultPii:false and strips request data;
    // an `extra` payload here would smuggle the applicant's name/email back in.
    send.mockRejectedValue(new Error("resend down"));
    await post(VALID);

    expect(captureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = captureException.mock.calls[0] as [Error, Record<string, unknown>];
    expect(err).toBeInstanceOf(Error);
    expect(ctx).toEqual({ tags: { route: "apply" } });
    expect(JSON.stringify(ctx)).not.toContain("ann@acme.co");
    expect(JSON.stringify(ctx)).not.toContain("Ann Smith");
  });
});

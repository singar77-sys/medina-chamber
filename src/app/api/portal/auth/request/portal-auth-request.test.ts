import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// PR1 item 3: the magic-link email must HTML-escape every dynamic field so a
// member-controlled firstName can't inject markup, and the magic link must still
// round-trip (its token survives escaping + URL-encoding intact). We mock the DB,
// email sender, and token signer so we can inspect the exact HTML that would ship.

const MALICIOUS_NAME = `<img src=x onerror=alert(1)>"'&`;
const CONTACT = { id: "c1", firstName: MALICIOUS_NAME, magicTokenEpoch: 0 };

let contactRow: typeof CONTACT | undefined = CONTACT;
const limit = vi.fn(async () => (contactRow ? [contactRow] : []));
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));
vi.mock("@/lib/db", () => ({ db: { select } }));
vi.mock("@/lib/db/schema", () => ({ contacts: { email: "email", id: "id" } }));

// A token containing characters that MUST survive URL-encoding but must NOT be
// double-escaped into broken HTML entities.
const TOKEN = "payload.sig+with/special=chars&stuff";
vi.mock("@/lib/portal-session", () => ({
  signMagicToken: vi.fn(async () => TOKEN),
}));

const send = vi.fn(async (_args: { to: string; subject: string; html: string }) => ({
  id: "email_1",
}));
// Partial mock: the REAL EMAIL_RE (and CHAMBER_NOTIFY_EMAIL) come from source,
// only the transport is stubbed. A hand-copied regex here would silently stop
// testing the one the route actually ships.
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  resend: { emails: { send } },
}));

vi.mock("@/lib/rate-limit", () => ({ limitPortalAuth: vi.fn(async () => null) }));

let POST: (req: Request) => Promise<Response>;

beforeAll(async () => {
  POST = (await import("./route")).POST;
});

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
  // The dormant-backend guard 404s this route unless internal transactions are
  // on; these tests exercise the email path that runs once the flag is set.
  // afterEach unstubs everything, so it has to be re-stubbed per test.
  vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "true");
  contactRow = CONTACT;
});

afterEach(() => {
  send.mockClear();
  // The contacts lookup is asserted on too (the dormant guard must land before
  // it), so it needs the same per-test reset the sender has.
  select.mockClear();
  vi.unstubAllEnvs();
});

function reqFor(email: string): Request {
  return new Request("https://medinaohchamber.com/api/portal/auth/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

describe("portal magic-link email — HTML escaping", () => {
  it("escapes a malicious firstName in the rendered HTML", async () => {
    const res = await POST(reqFor("member@example.com"));
    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);

    const html = send.mock.calls[0][0].html as string;

    // The raw dangerous markup must NOT appear verbatim...
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    // ...and the escaped entities must be present.
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;"); // single quote escaped
    expect(html).toContain("&amp;");
  });

  it("keeps the magic link valid and round-trippable after escaping", async () => {
    await POST(reqFor("member@example.com"));
    const html = send.mock.calls[0][0].html as string;

    // Pull the href out of the rendered anchor.
    const match = html.match(/href="([^"]+)"/);
    expect(match).not.toBeNull();
    const href = match![1];

    // The link is https, points at the verify endpoint, and the token decodes
    // back to exactly what we signed — escaping didn't corrupt it.
    expect(href.startsWith("https://medinaohchamber.com/api/portal/auth/verify?token=")).toBe(true);
    const url = new URL(href.replace(/&amp;/g, "&"));
    expect(url.searchParams.get("token")).toBe(TOKEN);
  });

  it("forces https even if NEXT_PUBLIC_SITE_URL is misconfigured as http in prod", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://medinaohchamber.com");
    await POST(reqFor("member@example.com"));
    const html = send.mock.calls[0][0].html as string;
    const href = html.match(/href="([^"]+)"/)![1];
    expect(href.startsWith("https://")).toBe(true);
    expect(href.startsWith("http://")).toBe(false);
  });
});

describe("POST /api/portal/auth/request — dormant backend", () => {
  // Pre-cutover this was an unauthenticated endpoint that ran a real contacts
  // SELECT and a real Resend send for any address a caller supplied — a member
  // oracle and a mailer in one. The 404 must land before both.
  it("404s before the contacts lookup and the email send", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "");
    const res = await POST(reqFor("member@example.com"));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
    expect(select).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("404s — not the generic ok:true — so the dormant route can't be probed", async () => {
    vi.stubEnv("INTERNAL_TRANSACTIONS_ENABLED", "");
    const body = (await (await POST(reqFor("member@example.com"))).json()) as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty("ok");
  });
});

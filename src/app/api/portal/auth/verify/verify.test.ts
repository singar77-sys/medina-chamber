import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { signMagicToken, verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";

// This route is NOT behind INTERNAL_TRANSACTIONS_ENABLED — it is reachable in
// production today, and it carries two guarantees that are invisible to review:
// GET must never consume the link (an Outlook SafeLinks prefetch would burn
// every login email), and POST must consume it exactly once via the
// magic_token_epoch guard (a forwarded or leaked link is otherwise replayable
// into a full member session).

const { state, update, select, logEngagement } = vi.hoisted(() => {
  const state = {
    updateRows: [] as Record<string, unknown>[],
    updateWhere: null as SQL | null,
    sessionEpoch: 0,
  };
  const returning = async () => state.updateRows;
  const set = () => ({
    where: (pred: SQL) => {
      state.updateWhere = pred;
      return { returning };
    },
  });
  return {
    state,
    update: vi.fn(() => ({ set })),
    // verifyPortalSession re-reads contacts.session_epoch to validate the cookie.
    select: vi.fn(() => ({
      from: () => ({ where: () => ({ limit: async () => [{ sessionEpoch: state.sessionEpoch }] }) }),
    })),
    logEngagement: vi.fn(async () => {}),
  };
});
vi.mock("@/lib/db", () => ({ db: { update, select } }));
vi.mock("@/lib/engagement", () => ({ logEngagement }));

let GET: (req: Request) => Promise<Response>;
let POST: (req: Request) => Promise<Response>;
beforeAll(async () => {
  ({ GET, POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("PORTAL_AUTH_SECRET", "p".repeat(48));
  state.updateRows = [];
  state.updateWhere = null;
  state.sessionEpoch = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const url = (token: string) =>
  `https://medinaohchamber.com/api/portal/auth/verify?token=${encodeURIComponent(token)}`;

const CONTACT = "11111111-1111-1111-1111-111111111111";
const ORG = "22222222-2222-2222-2222-222222222222";
const consumedRow = { id: CONTACT, organizationId: ORG, sessionEpoch: 0 };

describe("GET /api/portal/auth/verify (prefetch-safe)", () => {
  it("renders the POST interstitial and writes NOTHING", async () => {
    const token = await signMagicToken(CONTACT, "ann@acme.co", 0);
    const res = await GET(new Request(url(token)));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain('method="POST"');
    expect(update).not.toHaveBeenCalled();
  });

  it("redirects an unsigned/garbage token to /portal?error=invalid_link", async () => {
    const res = await GET(new Request(url("garbage.token")));
    expect(res.headers.get("location")).toContain("/portal?error=invalid_link");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("POST /api/portal/auth/verify (single use)", () => {
  const post = (token: string) => POST(new Request(url(token), { method: "POST" }));

  it("consumes the link under an epoch guard and issues a portal session", async () => {
    state.updateRows = [consumedRow];
    const token = await signMagicToken(CONTACT, "ann@acme.co", 0);
    const res = await post(token);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/portal/dashboard");

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${PORTAL_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");

    const sessionToken = decodeURIComponent(setCookie.split(`${PORTAL_COOKIE}=`)[1].split(";")[0]);
    const payload = await verifyPortalSession(sessionToken);
    expect(payload).toMatchObject({ contactId: CONTACT, organizationId: ORG, epoch: 0 });
  });

  it("scopes the consuming UPDATE to the contact AND its current magic_token_epoch", async () => {
    // Without asserting the predicate itself, deleting the epoch half of the
    // where() would leave every test above green while making links replayable.
    state.updateRows = [consumedRow];
    await post(await signMagicToken(CONTACT, "ann@acme.co", 7));

    expect(state.updateWhere).not.toBeNull();
    const q = new PgDialect().sqlToQuery(state.updateWhere!);
    expect(q.sql).toContain('"contacts"."id" = ');
    expect(q.sql).toContain('"contacts"."magic_token_epoch" = ');
    expect(q.params).toEqual([CONTACT, 7]);
  });

  it("refuses a replay (epoch already advanced → 0 rows updated) with no session cookie", async () => {
    state.updateRows = [];
    const res = await post(await signMagicToken(CONTACT, "ann@acme.co", 0));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toContain("/portal?error=invalid_link");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(logEngagement).not.toHaveBeenCalled();
  });

  it("refuses a bad token before touching the database", async () => {
    const res = await post("garbage.token");
    expect(res.headers.get("location")).toContain("/portal?error=invalid_link");
    expect(update).not.toHaveBeenCalled();
  });
});

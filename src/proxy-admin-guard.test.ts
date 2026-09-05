import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, signSession } from "@/lib/admin-session";
import { proxy, config } from "./proxy";

/**
 * The /admin auth guard, at both layers that enforce it.
 *
 * Real incident: admin auth was bypassable by sending `purpose: prefetch`.
 * The proxy's matcher deliberately skips prefetch requests (they render no
 * scripts, so there is no CSP work to do), and at the time the proxy was the
 * ONLY /admin gate - so a prefetch-headed request walked straight into the
 * dashboard and returned 200 with member PII. The fix was to make every admin
 * page self-guard in src/app/admin/(dashboard)/layout.tsx, demoting the proxy
 * to defense-in-depth.
 *
 * That means this file has to test BOTH halves, because either one alone can
 * regress silently:
 *   1. proxy() itself has no header-based bypass, and
 *   2. the matcher still excludes prefetch (so the layout guard is load-bearing,
 *      not optional) - see admin-layout-guard.test.ts for the layout half.
 *
 * Real HMAC throughout - admin-session and admin-users are NOT mocked, so a
 * broken signature check or a broken revocation check fails here.
 */

const TOKEN_A = "a".repeat(32); // ADMIN_USERS tokens must be >= 32 chars
const SESSION_SECRET = "s".repeat(48);

beforeEach(() => {
  vi.stubEnv("ADMIN_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("ADMIN_USERS", `Stephanie:${TOKEN_A}`);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function req(
  pathname: string,
  { cookie, headers }: { cookie?: string; headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest(`https://medinaohchamber.com${pathname}`, {
    headers: {
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
  });
}

function redirectTarget(res: Response): string | null {
  return res.headers.get("location");
}

// -- The guard itself ---------------------------------------------------------

describe("proxy() - /admin redirect guard", () => {
  const protectedPaths = [
    "/admin",
    "/admin/",
    "/admin/campaigns",
    "/admin/campaigns/new",
    "/admin/members/some-org-uuid",
    "/admin/dashboard",
  ];

  it.each(protectedPaths)("redirects %s to /admin/login with no session cookie", async (p) => {
    const res = await proxy(req(p));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("https://medinaohchamber.com/admin/login");
  });

  it("does NOT redirect /admin/login itself (would be a redirect loop)", async () => {
    const res = await proxy(req("/admin/login"));
    expect(res.status).toBe(200);
    expect(redirectTarget(res)).toBeNull();
  });

  it("lets a valid session for a current admin through", async () => {
    // Without this, every assertion above would pass on a guard that redirects
    // unconditionally - i.e. on a broken admin area.
    const token = await signSession("Stephanie");
    const res = await proxy(req("/admin/campaigns", { cookie: `${ADMIN_COOKIE}=${token}` }));
    expect(res.status).toBe(200);
    expect(redirectTarget(res)).toBeNull();
    // and it still gets the strict (nonce'd) CSP tier.
    expect(res.headers.get("Content-Security-Policy")).toContain("'nonce-");
  });

  it("finds the session cookie alongside other cookies", async () => {
    const token = await signSession("Stephanie");
    const res = await proxy(
      req("/admin", { cookie: `theme=dark; ${ADMIN_COOKIE}=${token}; _vercel_jwt=x` }),
    );
    expect(res.status).toBe(200);
  });

  it("redirects a tampered cookie and clears it", async () => {
    const token = await signSession("Stephanie");
    // Flip the last character of the signature.
    const forged = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    const res = await proxy(req("/admin", { cookie: `${ADMIN_COOKIE}=${forged}` }));

    expect(res.status).toBe(307);
    // The bad cookie must be cleared, or the browser re-sends it on every hop.
    expect(res.headers.get("set-cookie") ?? "").toContain(`${ADMIN_COOKIE}=`);
    expect(res.headers.get("set-cookie") ?? "").toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  });

  it("redirects a cookie signed with a different secret", async () => {
    const token = await signSession("Stephanie");
    // Rotating ADMIN_SESSION_SECRET is the deliberate revoke-everyone lever.
    vi.stubEnv("ADMIN_SESSION_SECRET", "z".repeat(48));
    const res = await proxy(req("/admin", { cookie: `${ADMIN_COOKIE}=${token}` }));
    expect(res.status).toBe(307);
  });

  it("redirects an expired session", async () => {
    const token = await signSession("Stephanie");
    // Sessions live 12h; jump 13h forward.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + 13 * 60 * 60 * 1000));
    const res = await proxy(req("/admin", { cookie: `${ADMIN_COOKIE}=${token}` }));
    expect(res.status).toBe(307);
  });

  it("redirects a valid session whose admin was revoked from ADMIN_USERS", async () => {
    // Per-admin revocation: removing Stephanie must lock her out on her NEXT
    // request, not after the 12h expiry.
    const token = await signSession("Stephanie");
    vi.stubEnv("ADMIN_USERS", `Jaclyn:${"b".repeat(32)}`);
    const res = await proxy(req("/admin", { cookie: `${ADMIN_COOKIE}=${token}` }));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("https://medinaohchamber.com/admin/login");
  });

  it("redirects when ADMIN_USERS is misconfigured (fail closed)", async () => {
    const token = await signSession("Stephanie");
    // Under-length token => the whole value is invalid => nobody is an admin.
    vi.stubEnv("ADMIN_USERS", "Stephanie:tooshort");
    const res = await proxy(req("/admin", { cookie: `${ADMIN_COOKIE}=${token}` }));
    expect(res.status).toBe(307);
  });

  it("over-matches sibling paths that merely start with /admin (documented, fail-safe)", async () => {
    // The auth guard uses a raw `pathname.startsWith("/admin")`, NOT the
    // segment-aware isDynamicHtmlRoute() used a few lines later for the CSP
    // tier. So a hypothetical public page like /administration-tips would be
    // bounced to the login screen. No such route exists today and the direction
    // of the error is fail-CLOSED, so this is pinned rather than fixed - but if
    // a public /admin*-prefixed page is ever added, this test is the warning.
    const res = await proxy(req("/administration-tips"));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("https://medinaohchamber.com/admin/login");
  });
});

// -- The prefetch bypass regression -------------------------------------------

describe("REGRESSION: `purpose: prefetch` must not bypass admin auth", () => {
  const PREFETCH_HEADERS: Array<Record<string, string>> = [
    { purpose: "prefetch" },
    { "next-router-prefetch": "1" },
    { purpose: "prefetch", "next-router-prefetch": "1" },
    // Header names are case-insensitive; a guard that string-matched the exact
    // lowercase name would still be bypassable.
    { Purpose: "Prefetch" },
  ];

  it.each(PREFETCH_HEADERS)(
    "proxy() still redirects an unauthenticated /admin request carrying %o",
    async (headers) => {
      // The handler must contain no header-sniffing shortcut of its own. This
      // is the exact request that once returned 200 with PII.
      const res = await proxy(req("/admin", { headers }));
      expect(res.status).toBe(307);
      expect(redirectTarget(res)).toBe("https://medinaohchamber.com/admin/login");
    },
  );

  it.each(PREFETCH_HEADERS)(
    "a revoked admin's prefetch to /admin is still redirected (%o)",
    async (headers) => {
      const token = await signSession("Stephanie");
      vi.stubEnv("ADMIN_USERS", `Jaclyn:${"b".repeat(32)}`);
      const res = await proxy(req("/admin", { cookie: `${ADMIN_COOKIE}=${token}`, headers }));
      expect(res.status).toBe(307);
    },
  );

  it("documents that the matcher SKIPS prefetch, so the proxy is not the only gate", () => {
    // This is the trap. Next never invokes proxy() for a request carrying these
    // headers, so every assertion above is defense-in-depth only. If this
    // expectation ever fails, someone changed the prefetch exclusion - which is
    // fine, but the admin layout self-guard (admin-layout-guard.test.ts) is what
    // actually closes the hole and must stay in place either way.
    const entry = config.matcher[0] as {
      source: string;
      missing?: Array<{ type: string; key: string; value?: string }>;
    };
    expect(entry.missing).toEqual([
      { type: "header", key: "next-router-prefetch" },
      { type: "header", key: "purpose", value: "prefetch" },
    ]);
    // The API surface is excluded too; /api/admin/* is guarded by
    // requireAdminSession, not by this proxy.
    expect(entry.source).toContain("api");
  });
});

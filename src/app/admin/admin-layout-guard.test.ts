import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_COOKIE, signSession } from "@/lib/admin-session";

/**
 * The OTHER half of the `purpose: prefetch` admin-auth bypass.
 *
 * src/proxy.ts guards /admin, but its matcher deliberately excludes prefetch
 * requests, so Next never invokes the proxy for one. That is precisely how the
 * original incident worked: a request with `purpose: prefetch` skipped the only
 * gate and rendered the dashboard, returning 200 with member PII.
 *
 * The fix was to make the dashboard route group self-guard. These tests call the
 * layout directly - no proxy, no matcher, nothing but the layout's own check -
 * which is exactly the position a prefetch request is in. Real HMAC: neither
 * admin-session nor admin-users is mocked, so deleting the signature check, the
 * expiry check, or the per-admin revocation check turns this file red.
 *
 * This is an auth assertion, not a rendering assertion: AdminNav is stubbed and
 * nothing is rendered - only whether redirect("/admin/login") fires.
 */

const TOKEN_A = "a".repeat(32); // ADMIN_USERS tokens must be >= 32 chars
const SESSION_SECRET = "s".repeat(48);

// `redirect()` in Next throws a control-flow error; mirror that so a layout
// that "redirects" and then keeps going would be caught rather than passing.
class RedirectSignal extends Error {
  constructor(public readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}
const redirect = vi.fn((to: string) => {
  throw new RedirectSignal(to);
});
vi.mock("next/navigation", () => ({ redirect }));

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "admin_session" && cookieValue !== undefined
        ? { value: cookieValue }
        : undefined,
  })),
}));

// The nav is a "use client" component with no bearing on the auth decision.
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));

let AdminDashboardLayout: (props: { children: React.ReactNode }) => Promise<unknown>;

beforeEach(async () => {
  vi.stubEnv("ADMIN_SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("ADMIN_USERS", `Stephanie:${TOKEN_A}`);
  redirect.mockClear();
  cookieValue = undefined;
  AdminDashboardLayout = (await import("./(dashboard)/layout")).default;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

/** Run the layout; returns the redirect target, or null if it rendered. */
async function render(): Promise<string | null> {
  try {
    await AdminDashboardLayout({ children: null });
    return null;
  } catch (err) {
    if (err instanceof RedirectSignal) return err.to;
    throw err;
  }
}

describe("admin (dashboard) layout self-guard", () => {
  it("redirects to /admin/login with no session cookie", async () => {
    cookieValue = undefined;
    expect(await render()).toBe("/admin/login");
  });

  it("redirects on an empty cookie value", async () => {
    cookieValue = "";
    expect(await render()).toBe("/admin/login");
  });

  it("redirects on a structurally invalid cookie", async () => {
    cookieValue = "not-a-signed-token";
    expect(await render()).toBe("/admin/login");
  });

  it("redirects on a tampered signature", async () => {
    const token = await signSession("Stephanie");
    cookieValue = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(await render()).toBe("/admin/login");
  });

  it("redirects on a cookie signed with a rotated secret", async () => {
    cookieValue = await signSession("Stephanie");
    vi.stubEnv("ADMIN_SESSION_SECRET", "z".repeat(48));
    expect(await render()).toBe("/admin/login");
  });

  it("redirects on an expired session", async () => {
    cookieValue = await signSession("Stephanie");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.now() + 13 * 60 * 60 * 1000)); // TTL is 12h
    expect(await render()).toBe("/admin/login");
  });

  it("redirects a valid session whose admin was removed from ADMIN_USERS", async () => {
    cookieValue = await signSession("Stephanie");
    vi.stubEnv("ADMIN_USERS", `Jaclyn:${"b".repeat(32)}`);
    expect(await render()).toBe("/admin/login");
  });

  it("redirects when ADMIN_USERS is misconfigured (fail closed)", async () => {
    cookieValue = await signSession("Stephanie");
    vi.stubEnv("ADMIN_USERS", "Stephanie:tooshort");
    expect(await render()).toBe("/admin/login");
  });

  it("renders for a valid session belonging to a current admin", async () => {
    // Without this the whole file would pass on a layout that redirects
    // unconditionally, i.e. an admin area nobody can reach.
    cookieValue = await signSession("Stephanie");
    expect(await render()).toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("REGRESSION: the guard does not depend on the proxy having run", async () => {
    // A prefetch request reaches this layout with the proxy skipped entirely.
    // The layout reads only the cookie - there is no header, no proxy-set
    // request header, and no upstream flag it could be trusting.
    cookieValue = undefined;
    expect(await render()).toBe("/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
    // ADMIN_COOKIE is the single input; naming it here fails the test if the
    // cookie name ever drifts apart from src/lib/admin-session.ts.
    expect(ADMIN_COOKIE).toBe("admin_session");
  });
});

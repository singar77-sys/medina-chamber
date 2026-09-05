import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_COOKIE, signSession } from "@/lib/admin-session";

// This layout is the REAL /admin page gate. The proxy matcher deliberately skips
// prefetch requests, which is exactly how admin pages were once reachable (with
// live member PII) by sending `purpose: prefetch`. Nothing tested the layout, so
// deleting the guard would still ship green.

const cookieValue = vi.hoisted(() => ({ current: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === ADMIN_COOKIE && cookieValue.current !== undefined
        ? { name, value: cookieValue.current }
        : undefined,
  }),
}));

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    // Next's redirect() throws; mirror that so code after the guard never runs.
    throw new Error(`REDIRECT:${path}`);
  }),
);
vi.mock("next/navigation", () => ({ redirect }));

// The nav is a client component; the layout only needs it as an element type.
vi.mock("@/components/admin/AdminNav", () => ({ AdminNav: () => null }));

const TOKEN_A = "a".repeat(32);
const TOKEN_B = "b".repeat(32);

let AdminDashboardLayout: (props: { children: null }) => Promise<unknown>;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("ADMIN_SESSION_SECRET", "s".repeat(48));
  vi.stubEnv("ADMIN_USERS", `Stephanie:${TOKEN_A},Jaclyn:${TOKEN_B}`);
  cookieValue.current = undefined;
  AdminDashboardLayout = (await import("./layout")).default;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const render = () => AdminDashboardLayout({ children: null });

describe("admin (dashboard) layout guard", () => {
  it("redirects to /admin/login when there is no session cookie", async () => {
    await expect(render()).rejects.toThrow("REDIRECT:/admin/login");
    expect(redirect).toHaveBeenCalledWith("/admin/login");
  });

  it("redirects when the cookie is not a valid signed session", async () => {
    cookieValue.current = "not.a.session";
    await expect(render()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("redirects when the session's subject was removed from ADMIN_USERS", async () => {
    cookieValue.current = await signSession("Stephanie");
    vi.stubEnv("ADMIN_USERS", `Jaclyn:${TOKEN_B}`);
    await expect(render()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("renders (no redirect) for a valid session belonging to a current admin", async () => {
    cookieValue.current = await signSession("Stephanie");
    await expect(render()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});

// Structural: a new admin page created OUTSIDE the (dashboard) group would
// inherit no guard at all and be served to anyone. /admin/login is the one
// deliberate exception (it must be reachable signed out).
describe("admin route group layout", () => {
  it("keeps every admin page inside the guarded (dashboard) group", () => {
    const adminDir = join(process.cwd(), "src", "app", "admin");
    const pages: string[] = [];
    const walk = (dir: string, rel: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const childRel = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) walk(join(dir, entry.name), childRel);
        else if (entry.name === "page.tsx") pages.push(childRel);
      }
    };
    walk(adminDir, "");

    expect(pages.length).toBeGreaterThan(1);
    const unguarded = pages.filter(
      (p) => !p.startsWith("(dashboard)/") && p !== "login/page.tsx",
    );
    expect(unguarded).toEqual([]);
  });
});

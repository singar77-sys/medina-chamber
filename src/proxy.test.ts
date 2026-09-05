import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { buildCsp, isDynamicHtmlRoute, proxy } from "./proxy";
import { THEME_SCRIPT_HASH } from "./lib/theme-script";

/**
 * The proxy serves two CSP tiers (see the file header): a strict nonce +
 * strict-dynamic policy for dynamically-rendered /admin and /portal routes,
 * and a static-compatible policy (no nonce; 'unsafe-inline' forced by the
 * un-hashable inline RSC payload) for everything else. These tests lock in
 * the security-relevant invariants of that split.
 */

// Directives that MUST be present and identical in both tiers — the split
// only ever relaxes script-src, never these.
const SHARED_STRICT_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://res.cloudinary.com https://images.squarespace-cdn.com https://75emgknx7u1oaaiq.public.blob.vercel-storage.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://*.hflip.co https://videoplayer.telvue.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

function scriptSrcOf(csp: string): string {
  const part = csp.split("; ").find((d) => d.startsWith("script-src "));
  if (!part) throw new Error(`no script-src in CSP: ${csp}`);
  return part;
}

describe("theme hash is a real hash source (not a client-ref stub)", () => {
  it("THEME_SCRIPT_HASH is a well-formed sha256 CSP source", () => {
    // Guards against importing THEME_SCRIPT_HASH from a "use client" module,
    // which would resolve to a client-reference stub and corrupt the CSP.
    expect(THEME_SCRIPT_HASH).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
  });
});

describe("isDynamicHtmlRoute", () => {
  it("classifies /admin and /portal (and subpaths) as dynamic", () => {
    for (const p of [
      "/admin",
      "/admin/login",
      "/admin/campaigns/new",
      "/portal",
      "/portal/billing",
    ]) {
      expect(isDynamicHtmlRoute(p)).toBe(true);
    }
  });

  it("classifies marketing/content routes as static", () => {
    for (const p of [
      "/",
      "/programs",
      "/about/board",
      "/events",
      "/news/blog",
      "/membership/pricing",
      // must not match on prefix substring collisions
      "/administration-tips",
      "/portalized",
    ]) {
      expect(isDynamicHtmlRoute(p)).toBe(false);
    }
  });
});

describe("buildCsp — dynamic tier (nonce present)", () => {
  const csp = buildCsp("TESTNONCE");
  const scriptSrc = scriptSrcOf(csp);

  it("uses nonce + strict-dynamic and NO 'unsafe-inline' for scripts", () => {
    expect(scriptSrc).toContain("'nonce-TESTNONCE'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("still lists the theme-script hash", () => {
    expect(scriptSrc).toContain(`'${THEME_SCRIPT_HASH}'`);
  });

  it("keeps every shared strict directive", () => {
    for (const d of SHARED_STRICT_DIRECTIVES) expect(csp).toContain(d);
  });
});

describe("buildCsp — static tier (no nonce)", () => {
  const csp = buildCsp(null);
  const scriptSrc = scriptSrcOf(csp);

  it("has no nonce and no strict-dynamic", () => {
    expect(scriptSrc).not.toContain("nonce-");
    expect(scriptSrc).not.toContain("'strict-dynamic'");
  });

  it("allows 'unsafe-inline' and lists NO hash/nonce (or hydration breaks)", () => {
    // 'unsafe-inline' is required because statically-prerendered Next pages
    // emit inline self.__next_f.push(...) scripts that carry neither a nonce
    // nor a pre-computable hash. CRITICAL: the static tier must NOT list any
    // hash or nonce alongside 'unsafe-inline' — under CSP Level 3 (every
    // current browser) the presence of a hash/nonce makes the browser IGNORE
    // 'unsafe-inline', which re-blocks the un-hashable RSC scripts and stops
    // the page from hydrating. This is the regression that took prod down;
    // the theme script is inline and already covered by 'unsafe-inline'.
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain(`'${THEME_SCRIPT_HASH}'`);
    expect(scriptSrc).not.toContain("sha256-");
  });

  it("keeps every shared strict directive (only script-src is relaxed)", () => {
    for (const d of SHARED_STRICT_DIRECTIVES) expect(csp).toContain(d);
  });
});

describe("CSP never allows script-XSS shortcuts on the dynamic tier", () => {
  it("dynamic tier is strictly stronger than static tier for scripts", () => {
    expect(scriptSrcOf(buildCsp("N"))).not.toContain("'unsafe-inline'");
    expect(scriptSrcOf(buildCsp(null))).toContain("'unsafe-inline'");
  });
});

describe("proxy() response headers", () => {
  it("sets a nonce'd CSP and forwards x-nonce on dynamic routes", async () => {
    const req = new NextRequest("https://medinachamber.com/portal/dashboard");
    const res = await proxy(req);
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toBeTruthy();
    expect(scriptSrcOf(csp!)).toContain("'nonce-");
    // x-nonce is forwarded to the React tree via the request headers.
    expect(scriptSrcOf(csp!)).not.toContain("'unsafe-inline'");
  });

  it("sets a nonce-free static CSP on marketing routes", async () => {
    const req = new NextRequest("https://medinachamber.com/programs");
    const res = await proxy(req);
    const csp = res.headers.get("Content-Security-Policy");
    expect(csp).toBeTruthy();
    expect(scriptSrcOf(csp!)).not.toContain("'nonce-");
    expect(scriptSrcOf(csp!)).toContain("'unsafe-inline'");
    // Non-script protections still present.
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

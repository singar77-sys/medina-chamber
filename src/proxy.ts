/**
 * Edge proxy (Next.js 16's renamed middleware) — Content Security Policy.
 *
 * Two CSP tiers, chosen per request path, because Next.js 16's rendering
 * model forces a real tradeoff between static generation and a nonce-based
 * script CSP:
 *
 *   - A statically prerendered App Router page emits inline RSC bootstrap
 *     scripts (`self.__next_f.push(...)`). Next can only stamp a nonce on
 *     those during *server-side* rendering from the request's CSP header;
 *     a build-time static page has no request, so they ship WITHOUT a
 *     nonce and WITHOUT an integrity hash (verified in Next 16.2.9:
 *     server/app-render/use-flight-response.js only nonces them, never
 *     hashes; required-scripts.js only adds SRI integrity to *external*
 *     bundles). Their content is per-page, so they can't be hash-listed
 *     ahead of time either. Under a nonce/`strict-dynamic` script-src they
 *     are blocked → the page never hydrates.
 *   - Reading the nonce in the root layout (`headers()`) also forces the
 *     ENTIRE app tree to render dynamically, killing TTFB/CDN caching for
 *     marketing pages that have no dynamic data at all.
 *
 * Resolution:
 *   - DYNAMIC HTML routes (`/admin/**`, `/portal/**`) keep the strict
 *     nonce + `strict-dynamic` policy. They render on-demand, so Next
 *     auto-nonces every inline script (including `__next_f`) from the CSP
 *     header on each request. Full script-XSS protection where sensitive
 *     data and auth live.
 *   - STATIC/ISR routes (all public marketing pages) get a policy WITHOUT
 *     a nonce. The un-hashable inline RSC payload forces `'unsafe-inline'`
 *     on `script-src` for these routes specifically — there is no CSP3
 *     construct that trusts variable inline scripts without a nonce or a
 *     per-script hash. Every OTHER directive stays identically strict
 *     (object-src 'none', base-uri 'self', form-action 'self',
 *     frame-ancestors 'none', img allowlist, connect-src, style-src), and
 *     the ThemeScript anti-FOUC inline script is pinned by a build-stable
 *     `'sha256-...'` hash rather than needing the relaxation. This tier is
 *     acceptable here because marketing pages have no reachable inline
 *     script-injection sink: JSON-LD blocks are `type="application/ld+json"`
 *     data (never executed by the browser, so `script-src` doesn't gate
 *     them) and are additionally `<`-escaped by safeJsonLd().
 *
 * The proxy runs on every matched request regardless of whether the HTML
 * is cached, so attaching a per-tier header to static routes does NOT make
 * them dynamic.
 *
 * The matcher skips static assets, the API surface, the Sentry tunnel
 * (/monitoring/*), and prefetch requests so we don't waste CPU on those.
 *
 * v16 NOTE: file renamed from middleware.ts → proxy.ts and the export
 * renamed from `middleware` → `proxy`. Same runtime behavior.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSession, ADMIN_COOKIE } from "@/lib/admin-session";
import { isCurrentAdmin } from "@/lib/admin-users";
import { THEME_SCRIPT_HASH } from "@/lib/theme-script";

// Route prefixes that render dynamically (server-rendered on demand) and
// therefore support the strict per-request nonce + `strict-dynamic` policy.
// Everything else the matcher hits is statically generated.
const DYNAMIC_HTML_PREFIXES = ["/admin", "/portal"];

export function isDynamicHtmlRoute(pathname: string): boolean {
  return DYNAMIC_HTML_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Build the CSP header value. All directives are identical across tiers
 * except `script-src`:
 *   - dynamic tier: nonce + hash + strict-dynamic (no unsafe-inline)
 *   - static tier:  'self' + 'unsafe-inline', NO hash/nonce (forced by the
 *     un-hashable inline RSC payload — any hash/nonce would disable
 *     'unsafe-inline' under CSP3 and break hydration)
 */
export function buildCsp(nonce: string | null): string {
  const isDev = process.env.NODE_ENV === "development";

  let scriptSrc: string;
  if (nonce) {
    // Dynamic routes: Next auto-nonces framework + inline RSC scripts from
    // this header at render time. strict-dynamic trusts what they load.
    // The theme hash lets ThemeScript run without depending on the nonce.
    scriptSrc = isDev
      ? `script-src 'self' 'nonce-${nonce}' '${THEME_SCRIPT_HASH}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' '${THEME_SCRIPT_HASH}' 'strict-dynamic'`;
  } else {
    // Static routes: Next's inline RSC payload scripts (self.__next_f.push)
    // are per-page and cannot be nonced (no request at build time) or hashed
    // (content varies per page), so 'unsafe-inline' is the only source that
    // admits them. CRITICAL: no hash or nonce may appear alongside it — under
    // CSP Level 3 (every current browser) the presence of ANY hash/nonce in
    // script-src makes the browser IGNORE 'unsafe-inline', which would block
    // the un-hashable RSC scripts and stop the page from hydrating. The theme
    // script is inline too, so plain 'unsafe-inline' already covers it; it
    // does NOT need its hash listed here (and listing it breaks everything).
    scriptSrc = isDev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
      : `script-src 'self' 'unsafe-inline'`;
  }

  return [
    `default-src 'self'`,
    scriptSrc,
    // Tailwind injects inline styles; without 'unsafe-inline' Tailwind
    // breaks on every page. Acceptable trade — style XSS is much narrower
    // than script XSS.
    `style-src 'self' 'unsafe-inline'`,
    // Image hosts must be explicit. Same as next.config.ts remotePatterns.
    `img-src 'self' blob: data: https://res.cloudinary.com https://images.squarespace-cdn.com`,
    `font-src 'self'`,
    // Outbound connections from the client. Sentry tunnels through our
    // own origin (/monitoring) so we don't need the ingest hostname here.
    // Vercel Analytics/Speed Insights also same-origin.
    `connect-src 'self'`,
    // Allow the Medina Means Business flipbook (hosted on hflip.co) to load in
    // the magazine page <iframe>; default-src 'self' would otherwise block it.
    `frame-src https://*.hflip.co`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard /admin/** — skip the login page itself to avoid redirect loops
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const payload = token ? await readSession(token) : null;
    // Valid = correctly-signed, unexpired, AND still a current admin (per-admin
    // revocation via ADMIN_USERS — see isCurrentAdmin).
    const valid = payload !== null && isCurrentAdmin(payload.sub);
    if (!valid) {
      const res = NextResponse.redirect(new URL("/admin/login", request.url));
      if (token) res.cookies.delete(ADMIN_COOKIE);
      return res;
    }
  }

  const dynamic = isDynamicHtmlRoute(pathname);

  // Dynamic routes get a fresh per-request nonce; static routes get none
  // (their inline RSC scripts can't carry one — see the file header).
  // 16 random bytes → 22-char base64 nonce. crypto.getRandomValues is
  // available in the edge runtime.
  let nonce: string | null = null;
  if (dynamic) {
    const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
    nonce = btoa(String.fromCharCode(...nonceBytes));
  }

  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  // Forward the nonce to the React tree only on dynamic routes.
  if (nonce) requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Run on every page request EXCEPT:
    //   - /api/*           — API routes, JSON in JSON out, no scripts
    //   - /_next/static/*  — bundled JS/CSS, immutable
    //   - /_next/image     — image optimization proxy
    //   - /favicon.ico     — static
    //   - /monitoring      — Sentry tunnel; must not be CSP-restricted
    //   - prefetch reqs    — RSC prefetches don't render scripts
    {
      source:
        "/((?!api|_next/static|_next/image|favicon\\.ico|monitoring).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

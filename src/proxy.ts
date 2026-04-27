/**
 * Edge proxy (Next.js 16's renamed middleware) — Content Security Policy
 * with per-request nonce.
 *
 * Generates a fresh base64 nonce on every request and:
 *   1. Sets the CSP response header with that nonce.
 *   2. Forwards the nonce in the `x-nonce` request header so server
 *      components can read it via `headers().get("x-nonce")` and apply
 *      `nonce={nonce}` to any inline <script> they render (notably the
 *      JSON-LD blocks on event/blog/member detail pages).
 *
 * `'strict-dynamic'` lets framework-injected scripts (Next.js bootstrap,
 * Vercel Analytics, Speed Insights, Sentry browser SDK) execute as long
 * as they were loaded by a nonced script — which Next.js handles for us.
 *
 * The matcher skips static assets, the API surface, the Sentry tunnel
 * (/monitoring/*), and prefetch requests so we don't waste CPU on those.
 *
 * v16 NOTE: file renamed from middleware.ts → proxy.ts and the export
 * renamed from `middleware` → `proxy`. Same runtime behavior.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySession, ADMIN_COOKIE } from "@/lib/admin-session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard /admin/** — skip the login page itself to avoid redirect loops
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const valid = token ? await verifySession(token) : false;
    if (!valid) {
      const res = NextResponse.redirect(new URL("/admin/login", request.url));
      if (token) res.cookies.delete(ADMIN_COOKIE);
      return res;
    }
  }


  // 16 random bytes → 22-char base64 nonce. crypto.randomUUID is
  // available in the edge runtime; we hash it through btoa for compactness.
  const nonceBytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  const csp = [
    `default-src 'self'`,
    // strict-dynamic + nonce: trust scripts that we mark with the nonce,
    // and scripts those load (Next.js bootstrap → analytics, Sentry, etc).
    // Dev: React requires 'unsafe-eval' for hot reload / devtools.
    // Omitted in production — strict-dynamic covers runtime scripts.
    process.env.NODE_ENV === "development"
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  // Forward nonce to the React tree.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
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

import type { NextConfig } from "next";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";

// Security response headers applied to every route. We do NOT set CSP
// here — a strict CSP requires per-page nonces for the JSON-LD
// `dangerouslySetInnerHTML` blocks scattered across the app, which is
// non-trivial to retrofit. Without nonces, a CSP strict enough to be
// useful would break the site. We get most of the win from frame-ancestors
// (clickjacking) and X-Content-Type-Options (MIME sniffing) without that
// trade-off; HSTS is auto-applied by Vercel on the apex domain.
const securityHeaders = [
  // Clickjacking — prevent any site from embedding us in a frame/iframe
  { key: "X-Frame-Options", value: "DENY" },
  // MIME sniffing — browsers must respect Content-Type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referer leakage — only send full referer to same origin
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Powerful APIs — deny camera/mic/geo/etc by default; site doesn't use them
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  // DNS prefetch — keep on for perf; security-neutral
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project. Without this,
  // Turbopack walks up to C:\Users\Mark\ finds a stray package-lock.json,
  // and uses THAT directory as the root — which then can't resolve
  // tailwindcss / next-installed modules and OOMs the dev server.
  turbopack: {
    root: path.join(import.meta.dirname, "."),
  },
  images: {
    qualities: [55, 60, 75, 85],
    remotePatterns: [
      {
        // GrowthZone member logos and event images
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/micronetonline/**",
      },
      {
        // Squarespace blog post images
        protocol: "https",
        hostname: "images.squarespace-cdn.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Legacy Squarespace URLs — preserve old bookmarks and SEO equity by
  // permanently redirecting to the canonical Next.js route.
  async redirects() {
    return [
      {
        source: "/chamber-ambassadors",
        destination: "/about/ambassadors",
        permanent: true,
      },
    ];
  },
};

// Sentry build-time wrapper. Uploads source maps when SENTRY_AUTH_TOKEN
// is set in Vercel env (production); silently no-ops without it so local
// builds don't fail. tunnelRoute proxies Sentry through our origin so
// ad-blockers can't gut the error reporting.
export default withSentryConfig(nextConfig, {
  org: "hunter-systems",
  project: "javascript-nextjs-gq",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});

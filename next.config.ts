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
    qualities: [55, 60, 70, 75, 85],
    // Serve AVIF first (~20-30% smaller than WebP) with WebP fallback. Next
    // content-negotiates per Accept header and caches each variant.
    formats: ["image/avif", "image/webp"],
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
      {
        // Vercel Blob — CMS-uploaded event photos and media
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Static fonts under public/fonts — long-lived immutable caching is
      // safe here: font files are versioned by filename (BNBergen-Bold.woff2,
      // Mistrully.woff2, …) and are never overwritten in place with different
      // bytes under the same name. A new font ships as a new/renamed file.
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Static images under public/images — deliberately NOT `immutable`.
      // Deploy practice overwrites image files in place under the same name
      // (partner-logo swaps, "Life at the Chamber" gallery slot #N swaps,
      // hero photo replacements — see git history). `immutable` would pin
      // stale bytes in browser caches for a year, so we cap at one day and
      // force revalidation to pick up in-place replacements promptly.
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, must-revalidate" },
        ],
      },
    ];
  },
  // Legacy Squarespace URLs — preserve old bookmarks and SEO equity by
  // permanently (301/308) redirecting to the canonical Next.js route. The old
  // public site was a Squarespace marketing site on the apex domain; these flat
  // slugs live at DIFFERENT paths on the new site (nested under /about,
  // /programs, /membership, …), so they don't collide with any current route
  // and exact-match redirects are safe. The GrowthZone subdomain
  // (business.medinachamber.com — directory, events, jobs, hot deals, store,
  // join) stays live and is unaffected.
  async redirects() {
    const spotlightSlugs = [
      // Member-spotlight feature posts from the old /news blog (evergreen
      // business profiles). Enumerated explicitly — NOT a `/news/:slug`
      // wildcard — because a single-segment wildcard would also swallow the
      // new site's own /news/blog, /news/magazine, /news/podcast, and
      // /news/member-news pages and break them.
      "v3transportation",
      "orangetheoryfitness",
      "ferrell-whited-physical-therapy-services",
      "americanheartassociation",
      "rosecompany",
      "wellingtonimplement",
      "sequential-image-productions",
      "americansalongroup",
      "theechelon",
      "huffmanconstruction",
      "merrilllynchalecschreiber",
      "theallenthomasgroup",
      "cloverleafanimalhospital",
      "sperrymasica",
      "brooksidelawnservice",
      "montvilletownship",
      "sampsel",
      "russellconsulting",
      "northcourtlaundry",
      "everything-outdoor-camping",
      "getingear",
      "vitalant",
      "comfort-suites-brunswick",
      "newparagraph",
    ];

    return [
      // — Flat marketing pages: old apex slug → new nested route —
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/advocacy", destination: "/about/advocacy", permanent: true },
      { source: "/hall-of-fame", destination: "/about/hall-of-fame", permanent: true },
      { source: "/chamber-ambassadors", destination: "/about/ambassadors", permanent: true },
      { source: "/medina-safety-council", destination: "/programs/safety-council", permanent: true },
      { source: "/rental-space", destination: "/programs/rental-space", permanent: true },
      { source: "/athena-awards", destination: "/programs/athena-awards", permanent: true },
      { source: "/golfouting2026", destination: "/programs/golf-outing", permanent: true },
      { source: "/golf-outing", destination: "/programs/golf-outing", permanent: true },
      { source: "/social-connect", destination: "/programs/social-connect", permanent: true },
      { source: "/compass-program", destination: "/programs/compass", permanent: true },
      { source: "/committees-and-councils", destination: "/membership/committees", permanent: true },
      { source: "/committees", destination: "/membership/committees", permanent: true },
      { source: "/member-benefits", destination: "/membership/benefits", permanent: true },
      { source: "/savings-programs", destination: "/membership/savings", permanent: true },
      { source: "/pricing", destination: "/membership/pricing", permanent: true },
      { source: "/sponsorship", destination: "/events/sponsorships", permanent: true },
      { source: "/chamber-news", destination: "/news/blog", permanent: true },
      { source: "/member-directory", destination: "/membership/directory", permanent: true },

      // — Membership hub shim — there's no /membership index page yet, but
      //   several sub-pages link "← Back to Membership" to /membership. Send it
      //   to the benefits page for now. Non-permanent (307) on purpose: a real
      //   hub page may take this path later, and a cached 308 would block it.
      { source: "/membership", destination: "/membership/benefits", permanent: false },

      // — Member-spotlight blog posts → the member-news hub —
      ...spotlightSlugs.map((slug) => ({
        source: `/news/${slug}`,
        destination: "/news/member-news",
        permanent: true,
      })),

      // — Dated newsletter archive (/news/YYYY/M/D/slug — weekly updates &
      //   monthly newsletters back to 2020) → the news/blog index. The
      //   `(\\d{4})` guard on the first path segment means this matches ONLY
      //   the old dated URLs; it can never match /news/blog, /news/member-news,
      //   /news/magazine or /news/podcast (none start with a 4-digit segment),
      //   so the new news pages are untouched. The bare /news landing is
      //   intentionally NOT redirected — the new site serves its own hub there.
      { source: "/news/:year(\\d{4})/:rest*", destination: "/news/blog", permanent: true },
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

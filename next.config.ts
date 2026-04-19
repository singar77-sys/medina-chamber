import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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

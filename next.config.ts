import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Use unoptimized for dev; swap to Vercel image optimization in prod
  },
};

export default nextConfig;

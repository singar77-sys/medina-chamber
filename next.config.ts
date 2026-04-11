import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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

export default nextConfig;

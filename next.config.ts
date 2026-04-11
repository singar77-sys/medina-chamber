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
    ],
  },
};

export default nextConfig;

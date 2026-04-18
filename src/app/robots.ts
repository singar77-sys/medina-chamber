import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/design", "/icebreaker"],
    },
    sitemap: "https://medinachamber.com/sitemap.xml",
  };
}

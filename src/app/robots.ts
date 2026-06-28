import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /portal + /admin are the dormant custom member portal & admin (login-walled,
      // not part of the public launch); /go are tracked redirects. Keep them out of
      // the index alongside the API, the design playground, and the icebreaker.
      disallow: ["/api/", "/admin", "/portal", "/go/", "/design", "/icebreaker"],
    },
    sitemap: "https://medinachamber.com/sitemap.xml",
  };
}

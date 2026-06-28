import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /portal + /admin are the dormant custom member portal & admin (login-walled,
      // not part of the public launch); /events/*/register is the dormant on-site
      // event-registration flow (404s today, but keep it un-indexed in case a DB
      // event is seeded before cutover — public events register via GrowthZone);
      // /go are tracked redirects. Keep them out of the index alongside the API,
      // the design playground, and the icebreaker.
      disallow: ["/api/", "/admin", "/portal", "/events/*/register", "/go/", "/design", "/icebreaker"],
    },
    sitemap: "https://medinachamber.com/sitemap.xml",
  };
}

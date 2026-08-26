// Membership benefits-wheel promo video (10s ambient loop, muted) — shared
// by the directory and join pages so the paths and VideoObject stay in sync.
export const BENEFITS_VIDEO = "/videos/medina-chamber-membership-benefits-wheel.mp4";
export const BENEFITS_VIDEO_POSTER = "/videos/medina-chamber-membership-benefits-wheel-poster.webp";

export const benefitsWheelVideoJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "Greater Medina Chamber of Commerce Membership Benefits",
  description:
    "The five pillars of Greater Medina Chamber membership — connections, visibility, advocacy, savings, and education — for Medina County, Ohio businesses.",
  thumbnailUrl: `https://medinachamber.com${BENEFITS_VIDEO_POSTER}`,
  contentUrl: `https://medinachamber.com${BENEFITS_VIDEO}`,
  uploadDate: "2026-08-26",
  duration: "PT10S",
  publisher: {
    "@type": "Organization",
    name: "Greater Medina Chamber of Commerce",
    url: "https://medinachamber.com",
  },
};

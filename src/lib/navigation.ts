export interface NavItem {
  label: string;
  href: string;
  /** One-line descriptor shown in dropdown — helps outsiders understand opaque names */
  description?: string;
  external?: boolean;
  children?: NavItem[];
}

/**
 * GrowthZone external URLs — single source of truth.
 * Gateway pages on medinachamber.com link OUT to these for transactional actions.
 */
export const growthZone = {
  directory: "https://business.medinachamber.com/list",
  events: "https://business.medinachamber.com/member-events",
  memberNews: "https://business.medinachamber.com/news",
  joinApplication: "https://business.medinachamber.com/applicationtojoin2",
} as const;

/**
 * Navigation structured around VISITOR INTENT, not org chart.
 *
 * Visitor decision sequence:
 * 1. "What can this do for me?"  → Membership
 * 2. "Who's in it?"              → Directory (elevated)
 * 3. "What's happening?"         → Events
 * 4. "Tell me more"              → About / News
 * 5. "How do I join?"            → Join CTA (persistent)
 */
export const navigation: NavItem[] = [
  {
    label: "Why Join",
    href: "/membership",
    children: [
      {
        label: "Member Benefits",
        href: "/membership/benefits",
        description: "What you get as a Chamber member",
      },
      {
        label: "Pricing & Tiers",
        href: "/membership/pricing",
        description: "Investment levels based on company size",
      },
      {
        label: "Savings Programs",
        href: "/membership/savings",
        description: "Member-exclusive discounts and deals",
      },
      {
        label: "Committees & Councils",
        href: "/membership/committees",
        description: "Get involved in Chamber leadership",
      },
    ],
  },
  {
    label: "Directory",
    href: "/membership/directory",
    children: [
      {
        label: "Find a Business",
        href: "/membership/directory",
        description: "Search Medina County member businesses",
      },
    ],
  },
  {
    label: "Events",
    href: "/events",
    children: [
      {
        label: "Upcoming Events",
        href: "/events",
        description: "Mixers, workshops, and networking",
      },
      {
        label: "Athena Awards",
        href: "/events/athena-awards",
        description: "Honoring women leaders in Medina County",
      },
      {
        label: "Golf Outing",
        href: "/events/golf-outing",
        description: "Annual scramble and networking day",
      },
      {
        label: "Sponsorships & Ribbon Cuttings",
        href: "/events/sponsorships",
        description: "Celebrate milestones with the Chamber",
      },
    ],
  },
  {
    label: "Programs",
    href: "/programs",
    children: [
      {
        label: "Compass Mentorship",
        href: "/programs/compass",
        description: "Emerging leaders paired with business owners",
      },
      {
        label: "Social Connect",
        href: "/programs/social-connect",
        description: "Casual networking for members and guests",
      },
      {
        label: "Safety Council",
        href: "/programs/safety-council",
        description: "OSHA compliance and workplace safety",
      },
      {
        label: "Rental Space",
        href: "/programs/rental-space",
        description: "Book the Chamber building for your event",
      },
    ],
  },
  {
    label: "News",
    href: "/news",
    children: [
      {
        label: "Chamber News",
        href: "/news",
        description: "Updates from the Chamber",
      },
      {
        label: "Member Announcements",
        href: "/news/member-news",
        description: "Jobs, promotions, and milestones",
      },
      {
        label: "Magazine",
        href: "/news/magazine",
        description: "Medina Means Business publication",
      },
    ],
  },
  {
    label: "About",
    href: "/about",
    children: [
      {
        label: "About the Chamber",
        href: "/about",
        description: "Connecting businesses since 1938",
      },
      {
        label: "Advocacy",
        href: "/about/advocacy",
        description: "How we fight for your business",
      },
      {
        label: "Hall of Fame",
        href: "/about/hall-of-fame",
        description: "Medina's business legends",
      },
      {
        label: "Ambassadors",
        href: "/about/ambassadors",
        description: "Our volunteer welcome team",
      },
    ],
  },
];

export const ctaLink = {
  label: "Join Now",
  href: "/membership/join",
};

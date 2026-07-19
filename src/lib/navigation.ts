export interface NavItem {
  label: string;
  href: string;
  description?: string;
  external?: boolean;
  children?: NavItem[];
}

/**
 * GrowthZone external URLs — single source of truth.
 */
export const growthZone = {
  /** @deprecated - Member directory now lives at /membership/directory */
  directory: "https://business.medinachamber.com/list",
  events: "https://business.medinachamber.com/member-events",
  memberNews: "https://business.medinachamber.com/news",
  joinApplication: "https://business.medinachamber.com/applicationtojoin2",
  /** Member sign-in (GrowthZone MIC). The custom /portal is built but stays
   *  DORMANT until the GrowthZone cutover, so member login points here while the
   *  public site is live. (/a/MIC/Login 301-redirects to this canonical path.) */
  login: "https://business.medinachamber.com/MIC/Login",
  /** Individual member portal — append GZ slug */
  memberProfile: "https://business.medinachamber.com/list/Details/",
} as const;

/**
 * Primary nav — 4 items max.
 * Structured around visitor decision sequence, not org chart.
 *
 * Everything else is discoverable via search, page links, or footer.
 */
export const navigation: NavItem[] = [
  {
    label: "Directory",
    href: "/membership/directory",
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
        href: "/programs/athena-awards",
        description: "Honoring leaders who advance women in Medina County",
      },
      {
        label: "Golf Outing",
        href: "/programs/golf-outing",
        description: "Annual scramble and networking day",
      },
      {
        label: "Sponsorships & Ribbon Cuttings",
        href: "/events/sponsorships",
        description: "Celebrate milestones with the Chamber",
      },
      {
        label: "Reflections of Italy",
        href: "/programs/italy-trip",
        description: "10-day chamber group trip to Italy, Oct 2027",
      },
    ],
  },
  {
    label: "Membership",
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
        label: "Community Investor",
        href: "/membership/community-investor",
        description: "Chamber membership at the leadership level",
      },
      {
        label: "Programs",
        href: "/programs",
        description: "Mentorship, networking, safety, and Compass",
      },
      {
        label: "Rental Space",
        href: "/programs/rental-space",
        description: "Book a meeting room in downtown Medina",
      },
      // Committees & Councils — removed from the main nav 2026-07-10 by request.
      // The page is retained at /membership/committees (still reachable directly
      // and via site search). To restore it to the nav, uncomment this entry.
      // {
      //   label: "Committees & Councils",
      //   href: "/membership/committees",
      //   description: "Get involved in Chamber leadership",
      // },
      {
        label: "Savings Programs",
        href: "/membership/savings",
        description: "Member-exclusive discounts and deals",
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
        label: "Board of Directors",
        href: "/about/board",
        description: "Volunteer leaders guiding the Chamber",
      },
      {
        label: "Chamber Ambassadors",
        href: "/about/ambassadors",
        description: "Volunteers who welcome new members",
      },
      {
        label: "Advocacy",
        href: "/about/advocacy",
        description: "How we fight for your business",
      },
      {
        label: "News",
        href: "/news",
        description: "Chamber and member announcements",
      },
      {
        label: "Job Board",
        href: "/jobs",
        description: "Local openings from member businesses",
      },
      {
        label: "Hall of Fame",
        href: "/about/hall-of-fame",
        description: "Medina's business legends",
      },
      {
        label: "Contact",
        href: "/about/contact",
        description: "Get in touch with the Chamber",
      },
    ],
  },
];

export const ctaLink = {
  label: "Join Now",
  href: "/membership/join",
};

// Member login goes to GrowthZone (the live system of record). The custom magic-link
// portal (/portal) is built but stays dormant until the GrowthZone cutover.
export const memberLogin = {
  label: "Member Login",
  href: growthZone.login,
  external: true,
};

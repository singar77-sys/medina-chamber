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
        label: "Programs",
        href: "/programs",
        description: "Mentorship, networking, safety, and space rental",
      },
      {
        label: "Committees & Councils",
        href: "/membership/committees",
        description: "Get involved in Chamber leadership",
      },
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

/**
 * All searchable pages — used by the search overlay.
 * Includes everything from nav plus pages only reachable
 * via page links or footer.
 */
export const searchablePages: { label: string; href: string; keywords: string }[] = [
  // Directory
  { label: "Member Directory", href: "/membership/directory", keywords: "find business search company local medina" },
  // Events
  { label: "Upcoming Events", href: "/events", keywords: "calendar networking mixer workshop" },
  { label: "Athena Awards", href: "/events/athena-awards", keywords: "women leadership award ceremony" },
  { label: "Golf Outing", href: "/events/golf-outing", keywords: "golf scramble tournament summer" },
  { label: "Sponsorships & Ribbon Cuttings", href: "/events/sponsorships", keywords: "sponsor ribbon cutting grand opening" },
  // Membership
  { label: "Member Benefits", href: "/membership/benefits", keywords: "why join perks advantage" },
  { label: "Pricing & Tiers", href: "/membership/pricing", keywords: "cost price tier level investment" },
  { label: "Join the Chamber", href: "/membership/join", keywords: "join apply sign up membership application" },
  { label: "Savings Programs", href: "/membership/savings", keywords: "discount deal savings insurance" },
  { label: "Committees & Councils", href: "/membership/committees", keywords: "committee council volunteer leadership board" },
  // Programs
  { label: "Compass Mentorship", href: "/programs/compass", keywords: "mentor mentorship emerging leaders" },
  { label: "Social Connect", href: "/programs/social-connect", keywords: "social networking casual meetup" },
  { label: "Safety Council", href: "/programs/safety-council", keywords: "osha safety compliance workplace" },
  { label: "Rental Space", href: "/programs/rental-space", keywords: "rent room venue space building event" },
  // News
  { label: "Chamber News", href: "/news", keywords: "news update announcement" },
  { label: "Member Announcements", href: "/news/member-news", keywords: "member news jobs hiring milestone" },
  { label: "Magazine", href: "/news/magazine", keywords: "medina means business magazine publication" },
  // About
  { label: "About the Chamber", href: "/about", keywords: "about history mission" },
  { label: "Advocacy", href: "/about/advocacy", keywords: "advocacy government policy legislation" },
  { label: "Hall of Fame", href: "/about/hall-of-fame", keywords: "hall fame honor legacy" },
  { label: "Ambassadors", href: "/about/ambassadors", keywords: "ambassador volunteer welcome" },
  { label: "Contact", href: "/about/contact", keywords: "contact phone email address location" },
];

export const ctaLink = {
  label: "Join Now",
  href: "/membership/join",
};

export const memberLogin = {
  label: "Member Login",
  href: "https://greatermedinachamberofcommerce.growthzoneapp.com/a/MIC/Login",
};

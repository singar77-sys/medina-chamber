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
        href: "/programs/athena-awards",
        description: "Honoring women leaders in Medina County",
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
        label: "Rental Space",
        href: "/programs/rental-space",
        description: "Book a meeting room in downtown Medina",
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
      {
        label: "ROI Calculator",
        href: "/membership/roi",
        description: "See what non-membership is costing you",
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
  { label: "Athena Awards", href: "/programs/athena-awards", keywords: "women leadership award ceremony" },
  { label: "Golf Outing", href: "/programs/golf-outing", keywords: "golf scramble tournament summer" },
  { label: "Sponsorships & Ribbon Cuttings", href: "/events/sponsorships", keywords: "sponsor ribbon cutting grand opening" },
  // Membership
  { label: "Member Benefits", href: "/membership/benefits", keywords: "why join perks advantage" },
  { label: "Pricing & Tiers", href: "/membership/pricing", keywords: "cost price tier level investment" },
  { label: "Join the Chamber", href: "/membership/join", keywords: "join apply sign up membership application" },
  { label: "First 30 Days Onboarding", href: "/membership/first-30-days", keywords: "new member onboarding first 30 days checklist welcome orientation getting started" },
  { label: "Savings Programs", href: "/membership/savings", keywords: "discount deal savings insurance" },
  { label: "ROI Calculator", href: "/membership/roi", keywords: "roi calculator savings cost value return investment payback breakeven" },
  { label: "Committees & Councils", href: "/membership/committees", keywords: "committee council volunteer leadership board" },
  // Programs
  { label: "Compass Professional Development Program", href: "/programs/compass", keywords: "professional development program compass" },
  { label: "Social Connect", href: "/programs/social-connect", keywords: "social networking casual meetup" },
  { label: "Safety Council", href: "/programs/safety-council", keywords: "osha safety compliance workplace" },
  { label: "Rental Space", href: "/programs/rental-space", keywords: "rent room venue space building event" },
  // News
  { label: "Chamber News", href: "/news", keywords: "news update announcement" },
  { label: "Member Announcements", href: "/news/member-news", keywords: "member news jobs hiring milestone" },
  { label: "Job Board", href: "/jobs", keywords: "jobs hiring employment career work position opening" },
  { label: "Magazine", href: "/news/magazine", keywords: "medina means business magazine publication" },
  // About
  { label: "About the Chamber", href: "/about", keywords: "about history mission" },
  { label: "Advocacy", href: "/about/advocacy", keywords: "advocacy government policy legislation" },
  { label: "Hall of Fame", href: "/about/hall-of-fame", keywords: "hall fame honor legacy" },
  { label: "Board of Directors", href: "/about/board", keywords: "board directors leadership president julie mcnabb governance" },
  { label: "Chamber Ambassadors", href: "/about/ambassadors", keywords: "ambassador ambassadors volunteer welcome ribbon cutting new member" },
  { label: "Contact", href: "/about/contact", keywords: "contact phone email address location" },
  // Brand
  { label: "Medina Means Business", href: "/medina-means-business", keywords: "medina means business tagline brand magazine statement slogan" },
  // Resources
  { label: "Business Resources", href: "/resources", keywords: "resources guide programs tools medina county" },
  { label: "Start a Business in Medina County", href: "/resources/start-a-business", keywords: "start business medina ohio llc register license launch new" },
  { label: "Business Grants & Funding", href: "/resources/business-grants", keywords: "grant funding loan sba usda jobsohio finance money capital" },
  { label: "Workforce & Hiring Resources", href: "/resources/workforce", keywords: "hire workforce jobs training ohiomeansjobs techecred employees" },
  // Communities
  { label: "Medina County Communities", href: "/community", keywords: "community area city township county medina" },
  { label: "Medina Businesses", href: "/community/medina", keywords: "medina ohio business downtown square" },
  { label: "Brunswick Businesses", href: "/community/brunswick", keywords: "brunswick ohio business chamber" },
  { label: "Wadsworth Businesses", href: "/community/wadsworth", keywords: "wadsworth ohio business chamber" },
  { label: "Lodi Businesses", href: "/community/lodi", keywords: "lodi ohio business village" },
  { label: "Seville Businesses", href: "/community/seville", keywords: "seville ohio business" },
  { label: "Valley City Businesses", href: "/community/valley-city", keywords: "valley city ohio business" },
  { label: "Hinckley Businesses", href: "/community/hinckley", keywords: "hinckley ohio business buzzard" },
];

export const ctaLink = {
  label: "Join Now",
  href: "/membership/join",
};

export const memberLogin = {
  label: "Member Login",
  href: "https://greatermedinachamberofcommerce.growthzoneapp.com/a/MIC/Login",
};

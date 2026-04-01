export interface NavItem {
  label: string;
  /**
   * For leaf items: rendered as the link destination.
   * For parent items with children: serves as the section landing page href.
   * Currently, parent hrefs are used by the Header as dropdown-only triggers
   * (the href itself is not rendered as a link). When section landing pages
   * are built, the Header Dropdown should render parent labels as links.
   */
  href: string;
  external?: boolean;
  children?: NavItem[];
}

export const navigation: NavItem[] = [
  {
    label: "Membership",
    href: "/membership",
    children: [
      { label: "Member Benefits", href: "/membership/benefits" },
      { label: "Pricing & Tiers", href: "/membership/pricing" },
      { label: "Savings Programs", href: "/membership/savings" },
      {
        label: "Member Directory",
        href: "https://business.medinachamber.com/list",
        external: true,
      },
      { label: "Committees & Councils", href: "/membership/committees" },
    ],
  },
  {
    label: "Events",
    href: "/events",
    children: [
      {
        label: "Upcoming Events",
        href: "https://business.medinachamber.com/member-events",
        external: true,
      },
      { label: "Athena Awards", href: "/events/athena-awards" },
      { label: "Golf Outing", href: "/events/golf-outing" },
      {
        label: "Sponsorships & Ribbon Cuttings",
        href: "/events/sponsorships",
      },
    ],
  },
  {
    label: "Programs",
    href: "/programs",
    children: [
      { label: "Social Connect", href: "/programs/social-connect" },
      { label: "Compass Program", href: "/programs/compass" },
      { label: "Safety Council", href: "/programs/safety-council" },
      { label: "Rental Space", href: "/programs/rental-space" },
    ],
  },
  {
    label: "News",
    href: "/news",
    children: [
      { label: "Chamber News", href: "/news" },
      {
        label: "Member News",
        href: "https://business.medinachamber.com/news",
        external: true,
      },
      {
        label: "Medina Means Business Magazine",
        href: "https://medinachamber.com/magazine", // TODO: update after DNS cutover — build /news/magazine or point to new host
        external: true,
      },
    ],
  },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "About Us", href: "/about" },
      { label: "Advocacy", href: "/about/advocacy" },
      { label: "Hall of Fame", href: "/about/hall-of-fame" },
      { label: "Chamber Ambassadors", href: "/about/ambassadors" },
      { label: "Contact", href: "/about/contact" },
    ],
  },
];

export const ctaLink = {
  label: "Join Now",
  href: "https://business.medinachamber.com/applicationtojoin2",
  external: true,
};

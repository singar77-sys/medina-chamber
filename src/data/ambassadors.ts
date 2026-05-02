/**
 * Volunteer Chamber Ambassadors. Edit this file to update the page at
 * /about/ambassadors. The page renders this list as-is, in order.
 */

export interface Ambassador {
  /** Stable slug used as the React key — must be unique. */
  slug: string;
  name: string;
  title: string;
  company: string;
  email: string;
  website?: string;
  /** Path under /public/. Aspect ratio expected to be portrait or square. */
  photo: string;
}

export const ambassadors: Ambassador[] = [
  {
    slug: "kari-deeks",
    name: "Kari Deeks",
    title: "Treasury Management Officer",
    company: "First Federal of Lakewood",
    email: "kdeeks@ffl.net",
    website: "https://www.ffl.bank/",
    photo: "/images/people/ambassadors/kari-deeks-first-federal-medina-chamber-ambassador.jpg",
  },
  {
    slug: "brittney-esser",
    name: "Brittney Esser",
    title: "Escrow Processor",
    company: "Title Select",
    email: "brittney@titleselect.net",
    website: "https://www.titleselect.net",
    photo: "/images/people/ambassadors/brittney-esser-title-select-medina-chamber-ambassador.jpg",
  },
  {
    slug: "tania-grant",
    name: "Tania Grant",
    title: "Owner",
    company: "TAG Studio",
    email: "taniagrantstudio@gmail.com",
    website: "https://www.tagvoiceover.com/",
    photo: "/images/people/ambassadors/tania-grant-tag-studio-medina-chamber-ambassador.jpg",
  },
  {
    slug: "don-hicks",
    name: "Don Hicks",
    title: "Area Vice President, Midwest Region",
    company: "Vensure",
    email: "don.hicks@vensure.com",
    website: "https://www.vensure.com/",
    photo: "/images/people/ambassadors/don-hicks-vensure-medina-chamber-ambassador.jpg",
  },
  {
    slug: "laurin-jeffers",
    name: "Laurin Jeffers",
    title: "Events and Community Manager",
    company: "Foundry Social / High Voltage Karting / MAD Brewing",
    email: "laurinj@highvoltagekarting.com",
    website: "https://thefoundrysocial.com/",
    photo: "/images/people/ambassadors/laurin-jeffers-foundry-social-medina-chamber-ambassador.jpg",
  },
  {
    slug: "danielle-litton",
    name: "Danielle Litton",
    title: "MRO Midwest Sales Manager",
    company: "National Process Systems",
    email: "Danielle.Litton@National-Process.com",
    website: "https://national-process.com/",
    photo: "/images/people/ambassadors/danielle-litton-national-process-systems-medina-chamber-ambassador.jpg",
  },
  {
    slug: "claus-meyer",
    name: "Claus Meyer",
    title: "Certified Financial Planner",
    company: "Raymond James",
    email: "claus.meyer@raymondjames.com",
    website: "https://www.raymondjames.com/clausmeyer",
    photo: "/images/people/ambassadors/claus-meyer-raymond-james-medina-chamber-ambassador.jpg",
  },
  {
    slug: "tom-muntean",
    name: "Tom Muntean",
    title: "Owner",
    company: "Thomas Muntean Agency / American Family Insurance",
    email: "TMUNTEAN@amfam.com",
    website: "https://www.amfam.com/agents/ohio/medina/thomas-muntean",
    photo: "/images/people/ambassadors/tom-muntean-american-family-insurance-medina-chamber-ambassador.jpg",
  },
  {
    slug: "cindy-phillips",
    name: "Cindy Phillips",
    title: "Vice President, Wealth Advisor",
    company: "Huntington Bank",
    email: "cindy.k.phillips@huntington.com",
    website: "https://www.huntington.com/",
    photo: "/images/people/ambassadors/cindy-phillips-huntington-bank-medina-chamber-ambassador.jpg",
  },
  {
    slug: "sam-pietrangelo",
    name: "Sam Pietrangelo",
    title: "Community Marketing Manager",
    company: "Armstrong",
    email: "spietrangelo@agoc.com",
    website: "https://armstrongonewire.com",
    photo: "/images/people/ambassadors/sam-pietrangelo-armstrong-medina-chamber-ambassador.jpg",
  },
  {
    slug: "tori-toth",
    name: "Tori Toth",
    title: "Walk Manager",
    company: "Alzheimer's Association",
    email: "tjtoth@alz.org",
    website: "https://www.alz.org",
    photo: "/images/people/ambassadors/tori-toth-alzheimers-association-medina-chamber-ambassador.jpg",
  },
  {
    slug: "kimberly-valco",
    name: "Kimberly Valco",
    title: "Community Relations",
    company: "Western Reserve Masonic Community",
    email: "kvalco@ohiomasonichome.org",
    website: "https://wrmcoh.org",
    photo: "/images/people/ambassadors/kimberly-valco-western-reserve-masonic-community-medina-chamber-ambassador.jpg",
  },
];

export const ambassadorRoles = [
  {
    title: "Welcome New Members",
    description:
      "Ambassadors personally greet businesses when they join the chamber. A handshake and a face that says \"you made a good call.\"",
  },
  {
    title: "Ribbon Cuttings",
    description:
      "When a member opens a new location or celebrates a milestone, ambassadors show up with scissors and enthusiasm.",
  },
  {
    title: "Event Representation",
    description:
      "Ambassadors attend chamber events, mixers, and community functions as the friendly face of the organization.",
  },
  {
    title: "Member Retention",
    description:
      "They check in with members throughout the year to make sure businesses are getting real value from their membership.",
  },
];

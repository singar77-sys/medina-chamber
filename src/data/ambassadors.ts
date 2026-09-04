/**
 * Volunteer Chamber Ambassadors. Edit this file to update the page at
 * /about/ambassadors. The page renders this list as-is, in order.
 */

export interface Ambassador {
  /** Stable slug used as the React key. Must be unique. */
  slug: string;
  name: string;
  title: string;
  company: string;
  /** chamberSlug of the member business — when set, the company name on the
   *  ambassadors page links to its directory detail page. Verified against
   *  members.json; leave unset for non-member businesses. */
  memberSlug?: string;
  email: string;
  website?: string;
  /** Path under /public/. Aspect ratio expected to be portrait or square. */
  photo: string;
}

export interface AmbassadorRole {
  title: string;
  description: string;
}

export const ambassadors: Ambassador[] = [
  {
    slug: "kari-deeks",
    name: "Kari Deeks",
    title: "Treasury Management Officer",
    company: "First Federal of Lakewood",
    memberSlug: "first-federal-of-lakewood",
    email: "kdeeks@ffl.net",
    website: "https://www.ffl.bank",
    photo: "/images/people/ambassadors/kari-deeks-first-federal-medina-chamber-ambassador.jpg",
  },
  {
    slug: "brittney-esser",
    name: "Brittney Esser",
    title: "Escrow Processor",
    company: "Title Select",
    memberSlug: "title-select",
    email: "brittney@titleselect.net",
    website: "https://www.titleselect.net",
    photo: "/images/people/ambassadors/brittney-esser-title-select-medina-chamber-ambassador.jpg",
  },
  {
    slug: "don-hicks",
    name: "Don Hicks",
    title: "Area Vice President, Midwest Region",
    company: "Vensure",
    memberSlug: "vensurehr",
    email: "don.hicks@vensure.com",
    website: "https://www.vensure.com",
    photo: "/images/people/ambassadors/don-hicks-vensure-medina-chamber-ambassador.jpg",
  },
  {
    slug: "laurin-jeffers",
    name: "Laurin Jeffers",
    title: "Events and Community Manager",
    company: "Foundry Social / High Voltage Karting / MAD Brewing",
    memberSlug: "the-foundry-social-high-voltage-karting-mad-brewing",
    email: "laurinj@highvoltagekarting.com",
    website: "https://thefoundrysocial.com",
    photo: "/images/people/ambassadors/laurin-jeffers-foundry-social-medina-chamber-ambassador.jpg",
  },
  {
    slug: "danielle-litton",
    name: "Danielle Litton",
    title: "MRO Midwest Sales Manager",
    company: "National Process Systems",
    memberSlug: "national-process-systems",
    email: "danielle.litton@national-process.com",
    website: "https://national-process.com",
    photo: "/images/people/ambassadors/danielle-litton-national-process-systems-medina-chamber-ambassador.jpg",
  },
  {
    slug: "claus-meyer",
    name: "Claus Meyer",
    title: "Certified Financial Planner",
    company: "Raymond James",
    memberSlug: "raymond-james",
    email: "claus.meyer@raymondjames.com",
    website: "https://www.raymondjames.com/clausmeyer",
    photo: "/images/people/ambassadors/claus-meyer-raymond-james-medina-chamber-ambassador.jpg",
  },
  {
    slug: "cindy-phillips",
    name: "Cindy Phillips",
    title: "Vice President, Wealth Advisor",
    company: "Huntington Bank",
    memberSlug: "huntington-national-bank",
    email: "cindy.k.phillips@huntington.com",
    website: "https://www.huntington.com",
    photo: "/images/people/ambassadors/cindy-phillips-huntington-bank-medina-chamber-ambassador.jpg",
  },
  {
    slug: "sam-pietrangelo",
    name: "Sam Pietrangelo",
    title: "Community Marketing Manager",
    company: "Armstrong",
    memberSlug: "armstrong",
    email: "spietrangelo@agoc.com",
    website: "https://armstrongonewire.com",
    photo: "/images/people/ambassadors/sam-pietrangelo-armstrong-medina-chamber-ambassador.jpg",
  },
  {
    slug: "tori-toth",
    name: "Tori Toth",
    title: "Walk Manager",
    company: "Alzheimer's Association",
    memberSlug: "alzheimers-association-greater-east-ohio-chapter",
    email: "tjtoth@alz.org",
    website: "https://www.alz.org",
    photo: "/images/people/ambassadors/tori-toth-alzheimers-association-medina-chamber-ambassador.jpg",
  },
  {
    slug: "kimberly-valco",
    name: "Kimberly Valco",
    title: "Community Relations",
    company: "Western Reserve Masonic Community",
    memberSlug: "western-reserve-masonic-community",
    email: "kvalco@ohiomasonichome.org",
    website: "https://wrmcoh.org",
    photo: "/images/people/ambassadors/kimberly-valco-western-reserve-masonic-community-medina-chamber-ambassador.jpg",
  },
];

export const ambassadorsPageDescription =
  "Meet the volunteer Chamber Ambassadors of the Greater Medina Chamber of Commerce. Member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber across Medina County, Ohio.";

/**
 * Build the JSON-LD AboutPage schema. `origin` lets the same shape be
 * used for prod, preview, and local builds without hardcoding the host.
 */
export function ambassadorsJsonLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Chamber Ambassadors | Greater Medina Chamber of Commerce",
    description: ambassadorsPageDescription,
    url: `${origin}/about/ambassadors`,
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      member: ambassadors.map((a) => ({
        "@type": "Person",
        name: a.name,
        jobTitle: a.title,
        ...(a.email ? { email: a.email } : {}),
        image: `${origin}${a.photo}`,
        worksFor: {
          "@type": "Organization",
          name: a.company,
          ...(a.website ? { url: a.website } : {}),
        },
      })),
    },
  };
}

export const ambassadorRoles: AmbassadorRole[] = [
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

import { members, extractCity, type Member } from "./members";

export interface Community {
  slug: string;
  name: string;
  county: string;
  zip: string[];
  tagline: string;
  description: string;
  /** Short paragraph about why businesses here benefit from chamber membership */
  chamberPitch: string;
}

export const communities: Community[] = [
  {
    slug: "medina",
    name: "Medina",
    county: "Medina County",
    zip: ["44256"],
    tagline: "The heart of Medina County's business community",
    description:
      "Medina is the county seat and economic hub of Medina County, anchored by the Historic Medina Square, a thriving downtown district, and a growing corridor of commercial and healthcare businesses along Route 18. The Greater Medina Chamber of Commerce is headquartered here at 139 N. Court Street.",
    chamberPitch:
      "As a Medina-based business, the Chamber is your neighbors. Walk-in office hours, same-block networking events, and a directory listing seen by every business owner in the county.",
  },
  {
    slug: "brunswick",
    name: "Brunswick",
    county: "Medina County",
    zip: ["44212"],
    tagline: "Northern Medina County's commercial center",
    description:
      "Brunswick is the most populated city in Medina County with a strong retail, healthcare, and service economy along Route 303 and Pearl Road. The city's proximity to I-71 makes it a strategic location for businesses serving both Medina and Cuyahoga counties.",
    chamberPitch:
      "Brunswick businesses gain county-wide visibility through the Medina Chamber's 511+ member directory, networking events, and advocacy — connecting you to the broader Medina County market.",
  },
  {
    slug: "wadsworth",
    name: "Wadsworth",
    county: "Medina County",
    zip: ["44281"],
    tagline: "Where industry and community meet",
    description:
      "Wadsworth is a manufacturing and agricultural hub in southwestern Medina County with a charming downtown district along Main Street. Home to Swagelok, the Blue Tip Match Company heritage, and a growing small business scene.",
    chamberPitch:
      "Wadsworth businesses connect to the full Medina County network through chamber membership — advocacy at the county and state level, plus access to programs, events, and savings that serve the entire region.",
  },
  {
    slug: "lodi",
    name: "Lodi",
    county: "Medina County",
    zip: ["44254"],
    tagline: "Small-town character, county-wide connections",
    description:
      "Lodi is a village in Harrisville Township with a tight-knit business community, known for its walkable downtown, annual Sweet Corn Festival, and proximity to agricultural operations throughout southern Medina County.",
    chamberPitch:
      "Lodi businesses punch above their weight through chamber membership — the same directory visibility, networking access, and advocacy as any business in the county.",
  },
  {
    slug: "seville",
    name: "Seville",
    county: "Medina County",
    zip: ["44273"],
    tagline: "Gateway to southern Medina County",
    description:
      "Seville straddles Medina and Wayne counties along Route 3 with a mix of retail, agricultural, and service businesses. Its location at the intersection of Routes 3 and 224 gives businesses access to southern Medina County and the Wooster corridor.",
    chamberPitch:
      "Seville's position between Medina and Wayne counties makes chamber membership especially valuable — tap into a 511+ member network that stretches across the region.",
  },
  {
    slug: "valley-city",
    name: "Valley City",
    county: "Medina County",
    zip: ["44280"],
    tagline: "Rural roots, regional reach",
    description:
      "Valley City is a community in Liverpool Township known for its Frog Jump Festival, rural character, and growing base of home-based and small businesses. Located along Route 303, it connects Brunswick to the west and the Cuyahoga Valley to the east.",
    chamberPitch:
      "Home-based and small businesses in Valley City get the same chamber benefits as any storefront on the Square — directory listing, networking, advocacy, and savings programs.",
  },
  {
    slug: "hinckley",
    name: "Hinckley",
    county: "Medina County",
    zip: ["44233"],
    tagline: "Where the buzzards come home — and businesses thrive",
    description:
      "Hinckley Township is famous for the annual Buzzard Day celebration and Hinckley Reservation. The community supports a growing base of contractors, professional services, and specialty businesses serving both Medina and Summit counties.",
    chamberPitch:
      "Hinckley businesses gain visibility across Medina County through the chamber's directory, events, and advocacy — connecting you beyond the township line.",
  },
  {
    slug: "rittman",
    name: "Rittman",
    county: "Wayne/Medina County",
    zip: ["44270"],
    tagline: "A hardworking community with deep roots",
    description:
      "Rittman sits at the border of Wayne and Medina counties with a proud industrial heritage and a downtown that serves both counties. Local businesses benefit from the cross-county traffic along Route 57.",
    chamberPitch:
      "Rittman businesses sitting on the Medina-Wayne county line get access to the full Medina County business network through chamber membership.",
  },
  {
    slug: "lafayette",
    name: "Lafayette Township",
    county: "Medina County",
    zip: ["44256"],
    tagline: "Growing community, growing business",
    description:
      "Lafayette Township is one of Medina County's fastest-growing areas, with new residential development driving demand for local services, retail, and professional businesses along the Route 18 corridor.",
    chamberPitch:
      "Lafayette's growth means opportunity — chamber membership puts your business in front of every established and new business owner in the county.",
  },
];

/** Get a community by its slug */
export function getCommunityBySlug(slug: string): Community | undefined {
  return communities.find((c) => c.slug === slug);
}

/** Get all members whose address city matches (case-insensitive) */
export function getMembersByCity(cityName: string): Member[] {
  const lower = cityName.toLowerCase();
  return members.filter((m) => {
    const city = extractCity(m.address).toLowerCase();
    return city === lower;
  });
}

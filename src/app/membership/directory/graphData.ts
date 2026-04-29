import {
  type Member,
  extractCity,
  isCommunityInvestor,
  isVisibilityPlus,
} from "@/data/members";

export type NodeType = "member" | "category" | "city";
export type MemberTier = "ci" | "vp" | "standard";

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  // member-specific
  chamberSlug?: string;
  description?: string;
  website?: string;
  phone?: string;
  logoUrl?: string;
  categories?: string[];
  city?: string;
  address?: string;
  tier?: MemberTier;
  // filled by d3-force at runtime
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildGraphData(members: Member[]): GraphData {
  const categorySet = new Set<string>();
  const citySet = new Set<string>();

  members.forEach((m) => {
    m.categories.forEach((c) => categorySet.add(c));
    const city = extractCity(m.address);
    if (city) citySet.add(city);
  });

  const categories = [...categorySet].sort();
  const cities = [...citySet].sort();

  const categoryNodes: GraphNode[] = categories.map((cat) => ({
    id: `cat:${cat}`,
    name: cat,
    type: "category",
  }));

  const cityNodes: GraphNode[] = cities.map((city) => ({
    id: `city:${city}`,
    name: city,
    type: "city",
  }));

  const memberNodes: GraphNode[] = members.map((m) => ({
    id: m.chamberSlug,
    name: m.name,
    type: "member",
    chamberSlug: m.chamberSlug,
    description: m.description,
    website: m.website,
    phone: m.phone,
    logoUrl: m.logoUrl,
    categories: m.categories,
    city: extractCity(m.address),
    address: m.address,
    tier: isCommunityInvestor(m) ? "ci" : isVisibilityPlus(m) ? "vp" : "standard",
  }));

  const links: GraphLink[] = [];
  members.forEach((m) => {
    m.categories.forEach((cat) => {
      links.push({ source: m.chamberSlug, target: `cat:${cat}` });
    });
    const city = extractCity(m.address);
    if (city) {
      links.push({ source: m.chamberSlug, target: `city:${city}` });
    }
  });

  return {
    nodes: [...categoryNodes, ...cityNodes, ...memberNodes],
    links,
  };
}

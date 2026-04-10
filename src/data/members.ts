import membersData from "./members.json";

export interface Member {
  name: string;
  chamberSlug: string;
  gzSlug: string;
  gzUrl: string;
  address: string;
  phone: string;
  website: string;
  logoUrl: string;
  description: string;
  categories: string[];
  social: {
    facebook?: string;
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    pinterest?: string;
  };
  /** GrowthZone Rank class number — 2 = Visibility Plus, 10 = Enhanced, 20 = Standard */
  membershipTier: number;
}

/** Human-readable tier label */
export function getTierLabel(tier: number): "Visibility Plus" | "Featured" | "Enhanced" | "Standard" {
  if (tier === 2) return "Visibility Plus";
  if (tier === 5) return "Featured";
  if (tier === 10) return "Enhanced";
  return "Standard";
}

/** True for members with any premium tier (rank < 20) */
export function isPremiumMember(member: Member): boolean {
  return (member.membershipTier ?? 20) < 20;
}

/** True for members with Visibility Plus membership (rank 2) */
export function isVisibilityPlus(member: Member): boolean {
  return (member.membershipTier ?? 20) === 2;
}

export interface MembersData {
  generatedAt: string;
  totalCount: number;
  members: Member[];
}

const data = membersData as MembersData;

export const members: Member[] = data.members;
export const generatedAt: string = data.generatedAt;
export const totalCount: number = data.totalCount;

/** All unique categories, sorted by frequency */
export function getAllCategories(): string[] {
  const counts: Record<string, number> = {};
  members.forEach((m) =>
    m.categories.forEach((c) => {
      counts[c] = (counts[c] || 0) + 1;
    })
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

/** Lookup by chamberSlug — O(n) but called once per static page */
export function getMemberBySlug(slug: string): Member | undefined {
  return members.find((m) => m.chamberSlug === slug);
}

/** Extract city from address string */
export function extractCity(address: string): string {
  if (!address) return "";
  // Format: "123 Main St, Medina, OH, 44256"
  const parts = address.split(",");
  return parts.length >= 2 ? parts[1].trim() : "";
}

/** First two initials from business name */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

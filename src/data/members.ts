import membersData from "./members.json";
import {
  COMMUNITY_INVESTOR_SLUGS,
  VISIBILITY_PLUS_SLUGS,
} from "./tier-overrides";

export interface Member {
  name: string;
  chamberSlug: string;
  gzSlug: string;
  gzUrl: string;
  address: string;
  /** Structured city/street from the DB directory path (src/lib/directory.ts).
   *  Absent for hand-maintained members.json records, which only carry the
   *  joined `address` string. */
  city?: string;
  address1?: string;
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
  /** Legacy GrowthZone Rank class from the public directory scraper.
   *  2 = detected-premium (mostly Community Investors + some VP),
   *  10/20 = standard tiers. Ambiguous — do NOT use for tier gating;
   *  use isCommunityInvestor / isVisibilityPlus (authoritative) instead. */
  membershipTier: number;
}

/** Legacy label derived from the scraper's membershipTier. Kept only for
 *  display in places that show the raw scraper rank; the authoritative
 *  tier helpers below are what actually drives routing/priority. */
export function getTierLabel(tier: number): "Visibility Plus" | "Featured" | "Enhanced" | "Standard" {
  if (tier === 2) return "Visibility Plus";
  if (tier === 5) return "Featured";
  if (tier === 10) return "Enhanced";
  return "Standard";
}

/** True for the chamber's top-tier Community Investor members ($1,145/yr).
 *  Backed by the authoritative slug set in tier-overrides.ts, sourced
 *  from the authenticated GrowthZone admin API. */
export function isCommunityInvestor(member: Member): boolean {
  return COMMUNITY_INVESTOR_SLUGS.has(member.chamberSlug);
}

/** True for Visibility Plus members ($575/yr) — but NOT Community
 *  Investors. CI is strictly above VP; a member is one or the other,
 *  never both. */
export function isVisibilityPlus(member: Member): boolean {
  return (
    VISIBILITY_PLUS_SLUGS.has(member.chamberSlug) &&
    !COMMUNITY_INVESTOR_SLUGS.has(member.chamberSlug)
  );
}

/** True for any premium-tier member (CI or VP). */
export function isPremiumMember(member: Member): boolean {
  return isCommunityInvestor(member) || isVisibilityPlus(member);
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

/** All unique categories, sorted alphabetically */
export function getAllCategories(): string[] {
  const seen = new Set<string>();
  members.forEach((m) => m.categories.forEach((c) => seen.add(c)));
  return [...seen].sort((a, b) => a.localeCompare(b));
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

const AVATAR_PALETTE = [
  { bg: "bg-cambridge/15", text: "text-cambridge"  },
  { bg: "bg-oxford/10",    text: "text-oxford"     },
  { bg: "bg-accent/10",    text: "text-accent"     },
  { bg: "bg-amber-50",     text: "text-amber-700"  },
  { bg: "bg-violet-50",    text: "text-violet-700" },
] as const;

export type AvatarColor = (typeof AVATAR_PALETTE)[number];

/** Deterministic color slot from the palette, hashed by business name. */
export function getAvatarColor(name: string): AvatarColor {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** First alphabetical character of the business name (skips leading numbers/symbols). */
export function getAvatarInitial(name: string): string {
  const match = name.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : (name[0]?.toUpperCase() ?? "?");
}

/** Top N industries by member count, sorted descending. */
export function getTopIndustries(limit = 10): Array<{ category: string; count: number }> {
  const counts = new Map<string, number>();
  members.forEach((m) => {
    m.categories.forEach((c) => {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** All Community Investor members, derived from the authoritative slug set. */
export function getCommunityInvestors(): Member[] {
  return members.filter(isCommunityInvestor);
}

/**
 * Member search for chatbot context.
 * Finds the most relevant members for a given query
 * without sending all 511 records to the AI every time.
 */

import { members, type Member } from "@/data/members";

export interface MemberSnippet {
  name: string;
  categories: string[];
  address: string;
  phone: string;
  website: string;
  description: string;
  url: string;
}

function scoreMatch(member: Member, terms: string[]): number {
  let score = 0;
  const name = member.name.toLowerCase();
  const desc = member.description.toLowerCase();
  const cats = member.categories.map((c) => c.toLowerCase()).join(" ");
  const addr = member.address.toLowerCase();

  for (const term of terms) {
    if (name.includes(term)) score += 10;
    if (cats.includes(term)) score += 6;
    if (desc.includes(term)) score += 3;
    if (addr.includes(term)) score += 2;
  }

  // Boost premium members slightly so they surface when relevant
  if (member.membershipTier <= 5) score += 1;

  return score;
}

/**
 * Return up to `limit` members most relevant to the query.
 */
export function searchMembersForContext(
  query: string,
  limit = 8
): MemberSnippet[] {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  return members
    .map((m) => ({ member: m, score: scoreMatch(m, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ member: m }) => ({
      name: m.name,
      categories: m.categories,
      address: m.address,
      phone: m.phone,
      website: m.website,
      description: m.description,
      url: `https://medinachamber.com/membership/directory/${m.chamberSlug}`,
    }));
}

/** Format member snippets as a compact string for the system prompt */
export function formatMembersForPrompt(snippets: MemberSnippet[]): string {
  if (snippets.length === 0) return "";
  return snippets
    .map((m) => {
      const lines = [`**${m.name}**`];
      if (m.categories.length) lines.push(`  Categories: ${m.categories.join(", ")}`);
      if (m.address) lines.push(`  Address: ${m.address}`);
      if (m.phone) lines.push(`  Phone: ${m.phone}`);
      if (m.website) lines.push(`  Website: ${m.website}`);
      if (m.description) lines.push(`  About: ${m.description}`);
      lines.push(`  Profile: ${m.url}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

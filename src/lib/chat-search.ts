/**
 * Member search + formatting for ChamberBot context.
 * Finds the most relevant members and builds enriched prompts
 * using both GrowthZone data and scraped website content.
 */

import { members, type Member } from "@/data/members";
import { getWebData, formatEnrichedMember } from "@/lib/website-search";

function scoreMatch(member: Member, terms: string[]): number {
  let score = 0;
  const name = member.name.toLowerCase();
  const desc = member.description.toLowerCase();
  const cats = member.categories.map((c) => c.toLowerCase()).join(" ");
  const addr = member.address.toLowerCase();

  // Enrich scoring with scraped website content
  const web = getWebData(member.chamberSlug);
  const webText = [
    web?.metaDescription ?? "",
    web?.services?.join(" ") ?? "",
    web?.aboutText ?? "",
    web?.homeText?.substring(0, 500) ?? "",
  ].join(" ").toLowerCase();

  for (const term of terms) {
    if (name.includes(term)) score += 10;
    if (cats.includes(term)) score += 6;
    if (webText.includes(term)) score += 4; // website content is high signal
    if (desc.includes(term)) score += 3;
    if (addr.includes(term)) score += 2;
  }

  // Boost premium members slightly so they surface when relevant
  if (member.membershipTier <= 5) score += 1;

  return score;
}

/**
 * Return up to `limit` members most relevant to the query.
 * Website content boosts scoring separately inside formatEnrichedMember.
 */
export function searchMembersForContext(query: string, limit = 8): Member[] {
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
    .map(({ member }) => member);
}

/**
 * Format matched members into a prompt-ready string.
 * Pulls in website-scraped data automatically when available.
 */
export function formatMembersForPrompt(matched: Member[]): string {
  if (matched.length === 0) return "";
  return matched.map(formatEnrichedMember).join("\n\n");
}

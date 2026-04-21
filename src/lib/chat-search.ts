/**
 * Member search + formatting for ChamberBot context.
 * Finds the most relevant members and builds enriched prompts
 * using both GrowthZone data and scraped website content.
 */

import { members, isVisibilityPlus, type Member } from "@/data/members";
import { getWebData, formatEnrichedMember } from "@/lib/website-search";

// Common English words that have no value as search terms. Lowercase.
// Conservative list — only words that would create noise, not anything
// that might be part of a real business name or category.
const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being",
  "of","to","in","on","at","by","for","with","from","into","onto","over","under",
  "and","or","but","not","no","yes","so","if","then","than","that","this","these","those",
  "it","its","i","we","us","you","your","my","mine","our","ours","they","them","their",
  "he","she","him","her","his","hers",
  "what","when","where","why","how","who","which",
  "do","does","did","done","have","has","had","having",
  "can","could","should","would","may","might","must","will","shall",
  "all","any","some","more","most","much","many","each","every",
  "out","up","down","off","about","just","only","also","too","very",
  "tell","find","show","need","want","like","get","give","know","help",
  "me","please","thanks","thank",
]);

// For very short terms (likely acronyms or brand names like "3m", "ge",
// "bp", "cms"), require word-boundary match — otherwise "ge" would
// false-positive on "agency" or "manage". Longer terms use plain
// substring match because they're descriptive enough to not need it.
function termMatches(haystack: string, term: string): boolean {
  if (term.length <= 3) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(haystack);
  }
  return haystack.includes(term);
}

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
    if (termMatches(name, term)) score += 10;
    if (termMatches(cats, term)) score += 6;
    if (termMatches(webText, term)) score += 4; // website content is high signal
    if (termMatches(desc, term)) score += 3;
    if (termMatches(addr, term)) score += 2;
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
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

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

/**
 * Return matching members split into two groups — all Visibility Plus
 * members that scored > 0 (up to `vpLimit`), and up to `otherLimit`
 * of the next-highest-scoring non-VP members.
 *
 * The chat route injects these as two distinctly-labeled blocks so the
 * LLM can "always list VP members first, then suggest the full
 * directory" as a hard rule.
 */
export function searchMembersWithVPPriority(
  query: string,
  vpLimit = 20,
  otherLimit = 3,
): { vpMembers: Member[]; otherMembers: Member[] } {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  if (terms.length === 0) return { vpMembers: [], otherMembers: [] };

  const scored = members
    .map((m) => ({ member: m, score: scoreMatch(m, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const vpMembers = scored
    .filter(({ member }) => isVisibilityPlus(member))
    .slice(0, vpLimit)
    .map(({ member }) => member);

  const otherMembers = scored
    .filter(({ member }) => !isVisibilityPlus(member))
    .slice(0, otherLimit)
    .map(({ member }) => member);

  return { vpMembers, otherMembers };
}

/**
 * Format VP + other relevant members as two labeled blocks that the
 * prompt can reference by name. Returns empty string if both groups
 * are empty (no relevant members for this query).
 */
export function formatMembersGroupedForPrompt(
  vpMembers: Member[],
  otherMembers: Member[],
): string {
  const parts: string[] = [];
  if (vpMembers.length > 0) {
    parts.push(
      `VISIBILITY PLUS MEMBERS MATCHING THIS QUERY (the chamber's top-tier listings — list ALL of these first):\n\n${vpMembers
        .map(formatEnrichedMember)
        .join("\n\n")}`,
    );
  }
  if (otherMembers.length > 0) {
    parts.push(
      `OTHER RELEVANT MEMBERS (lower-tier; use as backup if VP matches are sparse):\n\n${otherMembers
        .map(formatEnrichedMember)
        .join("\n\n")}`,
    );
  }
  return parts.join("\n\n");
}

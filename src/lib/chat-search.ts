/**
 * Member search + formatting for ChamberBot context.
 * Finds the most relevant members and builds enriched prompts
 * using both GrowthZone data and scraped website content.
 */

import {
  members,
  isVisibilityPlus,
  isCommunityInvestor,
  type Member,
} from "@/data/members";
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

// Expand natural-language query terms to their directory-relevant equivalents.
// "barbecue" won't appear in any member category — "restaurant" will.
// Keys are lowercased query words; values are added to the scoring term set.
const TERM_EXPANSIONS: Record<string, string[]> = {
  // Food types → restaurant / food service
  barbecue:  ["restaurant", "food"],
  bbq:       ["restaurant", "food", "barbecue"],
  pizza:     ["restaurant", "food"],
  burger:    ["restaurant", "food"],
  burgers:   ["restaurant", "food"],
  sandwich:  ["restaurant", "food", "deli"],
  sandwiches:["restaurant", "food", "deli"],
  coffee:    ["cafe", "coffee", "restaurant", "food"],
  cafe:      ["restaurant", "coffee", "food"],
  breakfast: ["restaurant", "food"],
  brunch:    ["restaurant", "food"],
  lunch:     ["restaurant", "food"],
  dinner:    ["restaurant", "food"],
  sushi:     ["restaurant", "food"],
  tacos:     ["restaurant", "food", "mexican"],
  wings:     ["restaurant", "food"],
  beer:      ["brewery", "bar", "restaurant"],
  brewery:   ["restaurant", "bar"],
  wine:      ["winery", "restaurant"],
  eat:       ["restaurant", "food"],
  eating:    ["restaurant", "food"],
  dining:    ["restaurant", "food"],
  takeout:   ["restaurant", "food"],
  // Colloquial profession names → formal directory terms
  // Confirmed zero-hit via gap analysis against the real member DB.
  lawyer:       ["attorney", "attorneys", "legal"],
  lawyers:      ["attorney", "attorneys", "legal"],
  hvac:         ["heating", "cooling", "air conditioning"],
  electrician:  ["electrical", "contractor"],
  electricians: ["electrical", "contractor"],
  babysitter:   ["child care", "childcare", "children"],
  babysitters:  ["child care", "childcare", "children"],
  nanny:        ["child care", "childcare", "children"],
  // "vet" is ≤3 chars → word-boundary regex misses "Veterinary";
  // "veterinarian" ≠ substring of "veterinary" — both need expansion.
  vet:          ["veterinary", "animal"],
  veterinarian: ["veterinary", "veterinarians"],
  // Common intent phrases the stopword filter preserves as categories
  gym:          ["fitness", "health", "wellness"],
  workout:      ["fitness", "health", "gym"],
  haircut:      ["salon", "barber", "hair"],
  hair:         ["salon", "barber"],
  nails:        ["salon", "spa"],
  flowers:      ["florist", "floral"],
  printing:     ["print", "marketing", "signs"],
  storage:      ["self-storage", "storage"],
  movers:       ["moving", "relocation"],
  moving:       ["relocation", "movers"],
};

function expandTerms(terms: string[]): string[] {
  const expanded = new Set(terms);
  for (const t of terms) {
    const extras = TERM_EXPANSIONS[t];
    if (extras) extras.forEach((s) => expanded.add(s));
  }
  return [...expanded];
}

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

// Generate stem variants so "plumbers" matches "Plumbing", "contractors"
// matches "Contracting", etc. without a full NLP library. Each variant is
// tried independently; if any hit, the term scores once.
function stemVariants(term: string): string[] {
  const v = new Set([term]);
  // "plumbers" → "plumb", "electricians" → "electrician" → "electric"
  if (term.length >= 7 && term.endsWith("ers")) v.add(term.slice(0, -3));
  // "plumbing" → "plumb", "contracting" → "contract"
  if (term.length >= 7 && term.endsWith("ing")) v.add(term.slice(0, -3));
  // "contractors" → "contractor", "lawyers" → "lawyer"
  if (term.length >= 5 && term.endsWith("s") && !term.endsWith("ss")) v.add(term.slice(0, -1));
  // "construction" → "construct"
  if (term.length >= 8 && term.endsWith("tion")) v.add(term.slice(0, -4));
  return [...v];
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

  for (const rawTerm of terms) {
    const variants = stemVariants(rawTerm);
    const hit = (h: string) => variants.some((t) => termMatches(h, t));
    if (hit(name))    score += 10;
    if (hit(cats))    score += 6;
    if (hit(webText)) score += 4;
    if (hit(desc))    score += 3;
    if (hit(addr))    score += 2;
  }

  // Boost premium members slightly so they surface when relevant
  if (member.membershipTier <= 5) score += 1;

  return score;
}

/**
 * Return matching members split into three tier buckets —
 * Community Investor (chamber leadership, $1,145/yr), Visibility Plus
 * ($575/yr), and Other (everything else).
 *
 * The chat route injects these as three distinctly-labeled blocks so
 * the LLM's directory rule is:
 *   1. List ALL Community Investor matches first, highlighted as
 *      chamber-leadership-tier
 *   2. Then ALL Visibility Plus matches
 *   3. Then a few Other matches as backup
 *
 * Previous "searchMembersWithVPPriority" only split by VP/non-VP and
 * was ambiguous (the scraper's tier=2 flag mostly captured CI members,
 * not VP ones). Using authoritative tier-overrides from the admin API.
 */
export function searchMembersWithTierPriority(
  query: string,
  ciLimit = 20,
  vpLimit = 20,
  otherLimit = 3,
): { ciMembers: Member[]; vpMembers: Member[]; otherMembers: Member[]; totalMatchCount: number } {
  const terms = expandTerms(
    query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOPWORDS.has(t)),
  );

  if (terms.length === 0) {
    return { ciMembers: [], vpMembers: [], otherMembers: [], totalMatchCount: 0 };
  }

  const scored = members
    .map((m) => ({ member: m, score: scoreMatch(m, terms) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const sortByName = (a: Member, b: Member) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  const ciMembers = scored
    .filter(({ member }) => isCommunityInvestor(member))
    .slice(0, ciLimit)
    .map(({ member }) => member)
    .sort(sortByName);

  const vpMembers = scored
    .filter(({ member }) => isVisibilityPlus(member))
    .slice(0, vpLimit)
    .map(({ member }) => member)
    .sort(sortByName);

  const otherMembers = scored
    .filter(
      ({ member }) =>
        !isCommunityInvestor(member) && !isVisibilityPlus(member),
    )
    .slice(0, otherLimit)
    .map(({ member }) => member)
    .sort(sortByName);

  return { ciMembers, vpMembers, otherMembers, totalMatchCount: scored.length };
}

/**
 * Format the three-tier matched members as labeled prompt blocks.
 * CI first (chamber leadership), then VP, then Other. Includes a
 * TOTAL_MATCHING_COUNT header so the LLM can answer count questions
 * accurately ("how many plumbers?") without fabricating.
 * Returns empty string if all buckets are empty.
 */
export function formatMembersGroupedForPrompt(
  ciMembers: Member[],
  vpMembers: Member[],
  otherMembers: Member[],
  totalMatchCount?: number,
): string {
  if (ciMembers.length === 0 && vpMembers.length === 0 && otherMembers.length === 0) {
    return "";
  }
  const parts: string[] = [];
  if (totalMatchCount !== undefined) {
    parts.push(`TOTAL_MATCHING_COUNT: ${totalMatchCount} members match this query in the chamber directory. Use this exact number when answering count questions ("how many X?").`);
  }
  if (ciMembers.length > 0) {
    parts.push(
      `COMMUNITY INVESTOR MEMBERS MATCHING THIS QUERY (the chamber's leadership tier, list ALL of these first; these members invest at the highest level, sit on boards, and shape chamber policy):\n\n${ciMembers
        .map(formatEnrichedMember)
        .join("\n\n")}`,
    );
  }
  if (vpMembers.length > 0) {
    parts.push(
      `VISIBILITY PLUS MEMBERS MATCHING THIS QUERY (mid-tier premium listings, list ALL of these after Community Investor matches):\n\n${vpMembers
        .map(formatEnrichedMember)
        .join("\n\n")}`,
    );
  }
  if (otherMembers.length > 0) {
    parts.push(
      `OTHER RELEVANT MEMBERS (standard tier; use as backup if premium matches are sparse):\n\n${otherMembers
        .map(formatEnrichedMember)
        .join("\n\n")}`,
    );
  }
  return parts.join("\n\n");
}

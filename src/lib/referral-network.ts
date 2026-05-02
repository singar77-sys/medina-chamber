/**
 * Proactive connection recommendations for ChamberBot.
 *
 * When a user self-identifies their industry ("I'm a contractor", "we run
 * a restaurant"), we can surface complementary chamber members they'd likely
 * want to know about — not because they asked, but because the relationship
 * is predictable (contractor → insurance, restaurant → accountants, etc.).
 *
 * Detection fires once: on the user's 3rd message, scanning all prior user
 * turns for first-person industry self-identification. Search intent ("I need
 * a plumber") is explicitly excluded — that goes through the directory path.
 *
 * Called synchronously in the chat route before streamText so the context
 * block is part of the prompt, not a post-stream side effect.
 */

import {
  members,
  isCommunityInvestor,
  isVisibilityPlus,
  type Member,
} from "@/data/members";
import type { ChatTurn } from "@/lib/chat-session";

interface ReferralRule {
  industry: string;
  // Matches first-person self-identification — NOT search intent.
  // "I'm a contractor" → match. "I need a contractor" → no match.
  detect: RegExp;
  // Substrings of real member category strings (case-insensitive includes).
  partnerCategories: string[];
}

// Prefix that requires first-person ownership/identity signals.
// Written to match how people actually talk, not formal grammar.
const SELF_ID =
  "(i'?m|i am|we'?re|we are|i own|i run|we own|we run|" +
  "my (business|company|firm|shop|practice|agency|office|clinic|restaurant|store)|" +
  "our (business|company|firm|shop|practice|agency|office|clinic|restaurant|store)|" +
  "i work (in|as)|i('ve| have) (a|an|my own)|we('ve| have) (a|an|our own)|" +
  "i operate|we operate|i('?m| am) (a|an)|we('?re| are) (a|an))";

const REFERRAL_RULES: ReferralRule[] = [
  {
    industry: "contractor or construction company",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(contractor|construction|builder|remodel|renovati|general contractor|home builder)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Insurance", "Banks", "Accountants", "Architect"],
  },
  {
    industry: "restaurant or food service business",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(restaurant|bar |cafe|bakery|catering|food service|food truck|diner|bistro|brewery|winery)`,
      "i",
    ),
    partnerCategories: ["Insurance", "Accountants", "Banks", "Cleaning", "Marketing"],
  },
  {
    industry: "insurance agency or brokerage",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(insurance agent|insurance agency|insurance broker|we sell insurance|we offer insurance|we write insurance)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Banks", "Financial", "Real Estate", "Accountants"],
  },
  {
    industry: "real estate business",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(real estate|realtor|property management|property manager|we sell homes|we sell houses|real estate agent|real estate broker)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Insurance", "Banks", "Mortgage", "Inspection"],
  },
  {
    industry: "medical or dental practice",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(doctor|physician|dentist|dental|medical practice|clinic|optometrist|chiropractor|therapist|physical therapy|healthcare provider|veterinar)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Accountants", "Insurance", "Banks", "Technology"],
  },
  {
    industry: "law firm or legal practice",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(lawyer|attorney|law firm|we practice law|we'?re a law|legal practice|law office)`,
      "i",
    ),
    partnerCategories: ["Accountants", "Banks", "Financial", "Insurance", "Technology"],
  },
  {
    industry: "accounting or financial services firm",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(accountant|accounting firm|cpa |certified public|financial planner|financial advisor|bookkeep|we do taxes|tax preparat|we file taxes)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Banks", "Insurance", "Technology", "HR"],
  },
  {
    industry: "manufacturing business",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(manufacturer|manufacturing|fabricat|machine shop|we make|we produce|we manufacture|industrial|production facility)`,
      "i",
    ),
    partnerCategories: ["Insurance", "Attorneys", "Banks", "Staffing", "Accountants"],
  },
  {
    industry: "retail store or shop",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(retail store|gift shop|clothing store|boutique|jewelry store|home goods|we sell .{0,20}in (a |our )(store|shop)|we have a store|we have a shop)(?! homes| houses| real estate| insurance| cars| vehicles)`,
      "i",
    ),
    partnerCategories: ["Marketing", "Accountants", "Insurance", "Banks", "Cleaning"],
  },
  {
    industry: "technology or IT company",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(tech company|software company|it company|it services|technology company|web design|web development|app development|cybersecurity|managed service|msp |saas|we build software|we develop)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Accountants", "Banks", "Insurance", "Marketing"],
  },
  {
    industry: "marketing or advertising agency",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(marketing agency|advertising agency|ad agency|we do marketing|digital marketing|social media agency|we manage social|pr firm|public relations firm|creative agency)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Accountants", "Technology", "Photography", "Printing"],
  },
  {
    industry: "staffing or HR company",
    detect: new RegExp(
      `${SELF_ID}.{0,50}(staffing (agency|company|firm)|recruiting firm|temp agency|hr company|human resources company|we place workers|we find talent|we staff)`,
      "i",
    ),
    partnerCategories: ["Attorneys", "Insurance", "Banks", "Technology", "Training"],
  },
];

/**
 * Scan conversation turns for first-person industry self-identification.
 * Looks at up to the last 5 user messages. Returns the matching industry
 * label or null if no confident match.
 */
export function detectUserIndustry(turns: ChatTurn[]): string | null {
  const userText = turns
    .filter((t) => t.role === "user")
    .slice(-5)
    .map((t) => t.content)
    .join(" ");

  for (const rule of REFERRAL_RULES) {
    if (rule.detect.test(userText)) {
      return rule.industry;
    }
  }
  return null;
}

/**
 * Find complementary chamber members for the detected industry.
 * Excludes slugs already shown in the current query's member context.
 * Returns at most 3 members, CI-first then VP then other.
 */
export function getComplementaryMembers(
  industry: string,
  existingSlugs: Set<string>,
): Member[] {
  const rule = REFERRAL_RULES.find((r) => r.industry === industry);
  if (!rule) return [];

  const candidates = members.filter(
    (m) =>
      !existingSlugs.has(m.chamberSlug) &&
      m.categories.some((cat) =>
        rule.partnerCategories.some((pc) =>
          cat.toLowerCase().includes(pc.toLowerCase()),
        ),
      ),
  );

  const ci = candidates.filter(isCommunityInvestor);
  const vp = candidates.filter(isVisibilityPlus);
  const other = candidates.filter(
    (m) => !isCommunityInvestor(m) && !isVisibilityPlus(m),
  );

  return [...ci, ...vp, ...other].slice(0, 3);
}

/**
 * Format the 4th system block injected when a user's industry is detected.
 * The instruction keeps it contextual and non-robotic — the model should
 * weave in a mention only when it genuinely fits, not on every reply.
 */
export function formatConnectionContext(
  industry: string,
  connMembers: Member[],
): string {
  const memberLines = connMembers
    .map((m) => {
      const cat = m.categories[0] ?? "Chamber member";
      return `- ${m.name} (${cat}), https://medinachamber.com/membership/directory/${m.chamberSlug}`;
    })
    .join("\n");

  return (
    `PROACTIVE CONNECTIONS, USER INDUSTRY CONTEXT:\n` +
    `This user has identified themselves as: ${industry}.\n` +
    `These chamber members are in complementary industries that commonly exchange referrals with ${industry} businesses:\n` +
    `${memberLines}\n\n` +
    `INSTRUCTION: At a natural moment in this or a future response, mention 1–2 of these members if it would genuinely help, ` +
    `for example, if the user describes a challenge these businesses could address, or if the conversation opens a relevant door. ` +
    `Do NOT list them in response to this turn unless it fits organically. ` +
    `Do NOT use this block when the user is already asking to find a specific type of business, the directory path handles that.`
  );
}

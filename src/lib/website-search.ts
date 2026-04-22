/**
 * Website data lookup for ChamberBot context.
 * Merges scraped website data with a member record to give the AI
 * a richer picture of what each business actually does.
 *
 * SECURITY: all scraped fields are sanitized before injection into LLM
 * context. Newlines are the primary prompt-injection vector (attackers
 * break out of a data field by adding line breaks that look like new
 * instructions). We collapse them to spaces and strip control characters
 * before any scraped text reaches the system prompt.
 */

import type { Member } from "@/data/members";
import { formatRatingLine } from "@/lib/ratings";

export interface MemberWebData {
  chamberSlug: string;
  website: string;
  scrapedAt: string;
  ok?: boolean;
  title?: string;
  metaDescription?: string;
  h1?: string[];
  services?: string[];
  listItems?: string[];
  homeText?: string;
  aboutText?: string;
  pagesScraped?: string[];
}

// Lazy-load website data — only imported when needed
let _webIndex: Record<string, MemberWebData> | null = null;

function getWebIndex(): Record<string, MemberWebData> {
  if (_webIndex) return _webIndex;
  try {
    // Dynamic require so this doesn't break builds if the file doesn't exist yet
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raw = require("@/data/member-websites.json");
    _webIndex = {};
    (raw.members as MemberWebData[]).forEach((m) => {
      if (m.ok !== false) _webIndex![m.chamberSlug] = m;
    });
  } catch {
    _webIndex = {};
  }
  return _webIndex;
}

export function getWebData(chamberSlug: string): MemberWebData | null {
  return getWebIndex()[chamberSlug] ?? null;
}

/**
 * Sanitize a scraped text field before it touches the LLM context.
 *
 * Strips C0/C1 control characters (except 0x09 tab — kept as a space
 * substitute), collapses all whitespace runs (including newlines and
 * carriage returns) to a single space, and truncates to maxLen. This
 * prevents a member website from injecting multi-line content that the
 * model could misread as a new instruction block.
 */
function sanitizeField(raw: string, maxLen: number): string {
  return raw
    // Strip null bytes and non-printable control characters
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    // Collapse all whitespace (newlines, tabs, CR) to a single space
    .replace(/[\r\n\t\s]+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/**
 * Format enriched member data as a compact string for the AI system prompt.
 */
export function formatEnrichedMember(member: Member): string {
  const lines: string[] = [`**${member.name}**`];

  if (member.categories.length) lines.push(`  Categories: ${member.categories.join(", ")}`);
  if (member.address)           lines.push(`  Address: ${member.address}`);
  if (member.phone)             lines.push(`  Phone: ${member.phone}`);
  if (member.website)           lines.push(`  Website: ${member.website}`);
  if (member.description)       lines.push(`  Chamber description: ${member.description}`);

  const web = getWebData(member.chamberSlug);
  if (web) {
    if (web.metaDescription && web.metaDescription !== member.description) {
      lines.push(`  Website tagline: ${sanitizeField(web.metaDescription, 200)}`);
    }
    if (web.services?.length) {
      const cleanServices = web.services
        .slice(0, 8)
        .map((s) => sanitizeField(s, 80));
      lines.push(`  Services/offerings: ${cleanServices.join(" · ")}`);
    }
    if (web.aboutText) {
      lines.push(`  About (from website): ${sanitizeField(web.aboutText, 400)}`);
    }
  }

  // Only include Google rating if 4.0+ (sub-4 ratings are silently omitted)
  const ratingLine = formatRatingLine(member.chamberSlug);
  if (ratingLine) lines.push(ratingLine);

  lines.push(`  Profile: https://medinachamber.com/membership/directory/${member.chamberSlug}`);
  return lines.join("\n");
}

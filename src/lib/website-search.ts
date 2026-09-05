/**
 * Website data lookup for ChamberBot context.
 * Merges scraped website data with a member record to give the AI
 * a richer picture of what each business actually does.
 *
 * SECURITY: every member-controlled field is sanitized before injection
 * into LLM context — not just the scraped website fields. Newlines are the
 * primary prompt-injection vector (attackers break out of a data field by
 * adding line breaks that look like new instructions). We collapse them to
 * spaces and strip control characters before any of this text reaches the
 * model.
 *
 * "Member-controlled" means both sources: the member's own website (scraped
 * into member-websites.json) AND the fields the member types into their
 * GrowthZone profile (name, categories, address, phone, website URL, and the
 * free-text description, which runs to ~2k characters). The GrowthZone side
 * used to go in raw — a member could paste a newline-separated "SYSTEM:"
 * block into their own directory description and have it rendered into the
 * prompt verbatim. Sanitizing one source and not the other left the hole
 * wide open, so all of them go through sanitizeField now.
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
 * The fence tag the chat route wraps member data in. Defined here, next to the
 * sanitizer that has to neutralize it, so the two can never drift apart: if the
 * route renames the tag and this constant isn't updated, the tests below fail.
 */
export const UNTRUSTED_FENCE_TAG = "untrusted_member_data";

// Matches an opening OR closing fence tag, case-insensitively, tolerating
// internal whitespace and stray attributes: `</untrusted_member_data>`,
// `< / UNTRUSTED_MEMBER_DATA >`, `<untrusted_member_data foo="bar">`.
// Whitespace inside the tag matters because sanitizeField collapses newlines to
// spaces FIRST, so `</untrusted_member_data\n>` arrives here as `</… >`.
const FENCE_TAG_RE = new RegExp(
  `<\\s*/?\\s*${UNTRUSTED_FENCE_TAG}\\b[^>]*>`,
  "gi",
);

/**
 * Sanitize a member-controlled text field before it touches the LLM context.
 *
 * Three things, in order:
 *
 *   1. Strip C0/C1 control characters (except 0x09 tab — kept as a space
 *      substitute), which a whitespace-only filter would pass straight through.
 *   2. Collapse all whitespace runs (newlines, CR, tabs) to a single space, so
 *      one field always renders as exactly one line. Newlines are the primary
 *      vector: a value that can emit a blank line followed by "SYSTEM: …" reads
 *      as a new block rather than as a field value.
 *   3. Neutralize any literal `<untrusted_member_data>` / `</…>` tag. The chat
 *      route wraps this text in that fence, and the fence is made of the same
 *      characters a member can type — a description containing the closing tag
 *      would end the block early and the rest of the member's copy would read
 *      as the visitor's own words. Angle brackets are neither control
 *      characters nor whitespace, so steps 1 and 2 do not touch them.
 *
 * Then truncate to maxLen as a backstop against a pathological value.
 */
export function sanitizeField(raw: string, maxLen: number): string {
  return raw
    // Strip null bytes and non-printable control characters
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    // Collapse all whitespace (newlines, tabs, CR) to a single space
    .replace(/[\r\n\t\s]+/g, " ")
    // Then close the delimiter escape — after the collapse, so a tag split
    // across lines has already been folded onto one.
    .replace(FENCE_TAG_RE, "[tag]")
    .trim()
    .slice(0, maxLen);
}

/**
 * Format enriched member data as a compact string for the AI system prompt.
 */
export function formatEnrichedMember(member: Member): string {
  // Every value below is typed by the member into their GrowthZone profile,
  // so all of it goes through sanitizeField. The maxLens are generous enough
  // that real listings are never truncated — the bound is a backstop against a
  // pathological value, and the whitespace/control-char collapse plus the fence
  // -tag strip are the parts that actually close the injection vector.
  //
  // Measured against all 503 records in members.json: name 100/120,
  // address 103/160, phone 21/40, website 130/200, description 2038/2500 —
  // and category 60/60, which sat exactly on the bound, so one longer category
  // would have clipped mid-word into the prompt. Category is 100 now.
  const lines: string[] = [`**${sanitizeField(member.name, 120)}**`];

  if (member.categories.length)
    lines.push(`  Categories: ${member.categories.map((c) => sanitizeField(c, 100)).join(", ")}`);
  if (member.address)           lines.push(`  Address: ${sanitizeField(member.address, 160)}`);
  if (member.phone)             lines.push(`  Phone: ${sanitizeField(member.phone, 40)}`);
  if (member.website)           lines.push(`  Website: ${sanitizeField(member.website, 200)}`);
  if (member.description)       lines.push(`  Chamber description: ${sanitizeField(member.description, 2500)}`);

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

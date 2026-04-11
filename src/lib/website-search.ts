/**
 * Website data lookup for ChamberBot context.
 * Merges scraped website data with a member record to give the AI
 * a richer picture of what each business actually does.
 */

import type { Member } from "@/data/members";

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
      lines.push(`  Website tagline: ${web.metaDescription}`);
    }
    if (web.services?.length) {
      lines.push(`  Services/offerings: ${web.services.slice(0, 8).join(" · ")}`);
    }
    if (web.aboutText) {
      lines.push(`  About (from website): ${web.aboutText.substring(0, 400)}`);
    }
  }

  lines.push(`  Profile: https://medinachamber.com/membership/directory/${member.chamberSlug}`);
  return lines.join("\n");
}

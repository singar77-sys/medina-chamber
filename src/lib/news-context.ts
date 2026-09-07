/**
 * Formats recent member news for injection into ChamberBot's prompt context.
 * Reads from the statically-built member-news.json and returns the most recent articles.
 *
 * TRUST TIER: UNTRUSTED. Read this before moving the block.
 *
 * Every field here — title, subtitle, body, memberName — is written by a
 * MEMBER BUSINESS and submitted through GrowthZone, then scraped verbatim into
 * member-news.json. That is the same third-party authorship as the directory
 * listings in website-search.ts, so it gets the same treatment: sanitized with
 * the SAME sanitizeField (one sanitizer, not two — a second copy would drift),
 * and rendered by the chat route inside the <untrusted_member_data> fence at
 * USER authority.
 *
 * It used to ride in the system role, bundled with the chamber-authored events
 * appendix, which put a member's own headline at the same authority level as
 * the chamber's policy — and unsanitized, so a newline in a title could open
 * what looked like a fresh instruction block. The events appendix stays in the
 * system role because the chamber owns the calendar; news does not, so it left.
 */

import newsData from "@/data/member-news.json";
import { sanitizeField } from "@/lib/website-search";

interface RawArticle {
  slug: string;
  articleId: string;
  title: string;
  subtitle: string;
  body: string;
  memberName: string;
  dateISO: string;
  dateRaw: string;
}

const allArticles = (newsData as { articles: RawArticle[] }).articles;

/** Scraper-generated slugs are lowercase words joined by single hyphens. A
 *  value that doesn't match never becomes a URL: a title-derived slug carrying
 *  ")" or a space would otherwise terminate the markdown link early and hand
 *  the rest of the member's text to the model as link syntax. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Markdown link TEXT can forge a destination: a title of
 *  `Deal](https://evil.example) [` splices a second link into the line the
 *  model then renders. sanitizeField handles newlines, control characters and
 *  the fence tag; the brackets are a markdown concern, stripped here.
 *
 *  This used to be applied to the title ALONE, on the reasoning that the title
 *  is the field that becomes link text. That was wrong: every field on the
 *  bullet renders as markdown, so a subtitle or body of
 *  `Register [here](https://evil.example) today` is a working link with a
 *  chamber-sounding label whether or not the title is one. The forgery is a
 *  MISLABELLED destination, not a new ability to emit one — the directory
 *  block already renders member-supplied URLs verbatim — so a bare URL is
 *  left alone (it shows its own destination); only the label syntax goes. */
function linkText(value: string): string {
  return value.replace(/[[\]()]/g, "").trim();
}

/** The one way a member-authored string becomes prompt text: the markdown
 *  strip, then the SHARED sanitizeField (control chars, whitespace collapse,
 *  fence tag, length). Both steps, one call site, so the next field added to a
 *  news bullet cannot pick up only half the treatment.
 *
 *  Order is load-bearing. sanitizeField rewrites a closing fence tag to the
 *  literal "[tag]", so stripping SECOND would eat that marker's brackets;
 *  stripping FIRST means every bracket and paren the member typed is already
 *  gone by the time "[tag]" appears, so the marker can never be followed by a
 *  "(" and can never become link syntax itself. */
function newsField(value: string | undefined, maxLen: number): string {
  return sanitizeField(linkText(value ?? ""), maxLen);
}

/** Returns a formatted string of recent member news. UNTRUSTED — the caller
 *  must place this inside the untrusted fence, never in a system message. */
export function formatNewsForPrompt(count = 6): string {
  const recent = [...allArticles]
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, count);
  if (recent.length === 0) return "";

  const lines = recent.map((a) => {
    // Slice the body BEFORE sanitizing so a wall of text can't cost a long
    // whitespace-collapse pass; sanitizeField applies the real bound after.
    // .trim() on the subtitle first: a subtitle of " " is truthy, so without it
    // a whitespace-only subtitle suppresses the body fallback and the post
    // silently loses its teaser altogether.
    const rawTeaser = a.subtitle?.trim() || (a.body ?? "").slice(0, 300);
    const teaser = newsField(rawTeaser, 160);
    const title = newsField(a.title, 200) || "Untitled member post";
    const memberName = newsField(a.memberName, 120);
    const member = memberName ? ` (${memberName})` : "";
    const date = DATE_RE.test(a.dateISO ?? "") ? a.dateISO : "date unknown";
    const headline = SLUG_RE.test(a.slug ?? "")
      ? `[${title}](https://medinachamber.com/news/member-news/${a.slug})`
      : title;
    return `- ${date}: ${headline}${member}${teaser ? `, ${teaser}` : ""}`;
  });

  return `RECENT MEMBER NEWS (${recent.length} latest posts, written and submitted by member businesses):\n${lines.join("\n")}`;
}

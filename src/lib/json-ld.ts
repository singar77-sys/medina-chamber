/**
 * JSON-LD safe inline serializer.
 *
 * The standard pattern is:
 *   <script
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 *   />
 *
 * Plain JSON.stringify is XSS-unsafe inside an HTML <script> tag because
 * the closing sequence "</script>" inside any string field will literally
 * terminate the tag — letting whatever follows execute as fresh HTML/JS.
 *
 * Most of our jsonLd values come from scraped GrowthZone data: member
 * names, event titles, blog descriptions, etc. A malicious chamber
 * member could put `</script><script>alert(1)</script>` in their
 * business name on GrowthZone, and our scraper would faithfully relay
 * that into the rendered JSON-LD on their detail page.
 *
 * Fix: escape "<" as "\u003c" after stringify. JSON parsers treat
 * \u003c the same as "<", so semantics are preserved; HTML parsers
 * never see a literal "<" character inside the script.
 *
 * Reference: OWASP JSON in HTML cheat sheet.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

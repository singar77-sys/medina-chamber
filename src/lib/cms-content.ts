import { unstable_cache } from "next/cache";
import { getContentField, CONTENT_FIELD_DEFS } from "@/lib/cms-store";

/**
 * Bridges the admin Content editor (Redis overrides) into the public pages.
 * Mirrors cms-blog.ts: unstable_cache keeps the Upstash REST call in the data
 * cache so the static pages stay prerendered, and the admin content API busts
 * CMS_CONTENT_TAG on save/reset so edits appear immediately.
 *
 * Every def's defaultValue mirrors the page's shipped copy verbatim, so with
 * no override stored the rendered output is byte-identical to the old
 * hardcoded text.
 */

export const CMS_CONTENT_TAG = "cms-content";

const getCachedField = unstable_cache(
  (page: string, field: string) => getContentField(page, field),
  ["cms-content-field"],
  { tags: [CMS_CONTENT_TAG], revalidate: 300 },
);

/** Resolve a content field: Redis override if set, else the static default. */
export async function getPageContent(page: string, field: string): Promise<string> {
  const def = CONTENT_FIELD_DEFS.find((d) => d.page === page && d.field === field);
  const value = await getCachedField(page, field);
  // `||`, not `??`: an admin who clears a field and saves stores an empty
  // string, and shipping that would delete live copy (the canonical office
  // hours line, a hero eyebrow). Blank means "use the shipped default".
  return value || def?.defaultValue || "";
}

/**
 * The "effective event" read model — scraped event + published CMS override,
 * merged BEFORE anything filters, sorts, formats or emits structured data.
 *
 * Why: /events/[slug] merged the Redis override, but every DISCOVERY surface
 * (the calendar, the homepage cards, the sitemap, the bot context) read
 * getUpcomingEvents() straight from the static scrape. An admin correcting a
 * time, venue or price fixed exactly one page and left every path that leads
 * to it stale — and a date correction was worse than cosmetic, because the
 * upcoming filter and the month grouping still ran on the OLD date, so the
 * event sorted into the wrong month or dropped off the calendar entirely.
 *
 * Caching notes, all of them load-bearing here:
 *  - The Upstash read is a bare fetch. Left uncached inside a route it would
 *    override the page's `revalidate` export and silently turn the route
 *    dynamic — that is exactly how /events/[slug] once prerendered ZERO pages.
 *    So the Redis call lives inside unstable_cache.
 *  - The outage fallback sits OUTSIDE that boundary. Degrading inside would
 *    let one transient blip get cached as "no overrides" for the whole window.
 *  - The cache carries CMS_EVENTS_TAG, the same tag the admin event-details
 *    route already busts on save/clear (revalidateTag(tag, "max") — Next 16
 *    needs the profile argument), so one invalidation covers the detail page
 *    and every discovery surface.
 */

import { unstable_cache } from "next/cache";
import { getRedis } from "@/lib/upstash";
import { CMS_EVENTS_TAG, type CmsEventData } from "@/lib/cms-store";
import { events as staticEvents, upcomingFrom, type ChamberEvent } from "@/data/events";

/** slug → override, for every event in the static scrape. One mget, not N gets. */
const getCachedEventOverrides = unstable_cache(
  async (): Promise<Record<string, CmsEventData>> => {
    const redis = getRedis();
    if (!redis) return {};
    const slugs = staticEvents.map((e) => e.slug);
    if (slugs.length === 0) return {};
    const rows = await redis.mget<(CmsEventData | null)[]>(
      ...slugs.map((s) => `cms:event:${s}`),
    );
    const out: Record<string, CmsEventData> = {};
    slugs.forEach((slug, i) => {
      const row = rows[i];
      if (row) out[slug] = row;
    });
    return out;
  },
  ["cms-event-overrides-all"],
  { tags: [CMS_EVENTS_TAG], revalidate: 300 },
);

/**
 * Every event with its published override applied. Source order is preserved —
 * callers that care about chronology use getEffectiveUpcomingEvents, which
 * sorts on the MERGED date.
 *
 * A Redis outage (or no Redis at all) degrades to the static scrape rather
 * than failing the page: the override store has always been purely additive.
 */
export async function getEffectiveEvents(): Promise<ChamberEvent[]> {
  let overrides: Record<string, CmsEventData> = {};
  try {
    overrides = await getCachedEventOverrides();
  } catch (err) {
    console.error("[events-effective] override read failed:", err);
  }
  if (Object.keys(overrides).length === 0) return staticEvents;
  return staticEvents.map((e) => {
    const o = overrides[e.slug];
    return o ? { ...e, ...o } : e;
  });
}

/**
 * Upcoming events, filtered and sorted on the EFFECTIVE date. This is the
 * read every discovery surface should use: /events, the homepage cards, the
 * bot's event context.
 */
export async function getEffectiveUpcomingEvents(
  now = new Date(),
): Promise<ChamberEvent[]> {
  const merged = await getEffectiveEvents();
  return upcomingFrom(merged, now).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}

/* No by-slug export here on purpose. /events/[slug] does its own single-key
 * read (getEventBySlug + getPublicCmsEventData) because it must also resolve
 * legacy slugs, and one `get` beats an mget of every event to answer for one.
 * An exported by-slug helper whose only caller was its own test is how a
 * second, divergent read path starts. */

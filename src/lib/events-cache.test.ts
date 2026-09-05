import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the two pieces of the event-page read path that are ours rather than
 * Next's: the tolerant slug lookup, and the cached photo wrapper's degradation
 * when Redis is down.
 */

const redisGet = vi.fn<(key: string) => Promise<unknown>>();

// unstable_cache is a passthrough here — the caching is Next's, the fallback
// and outage behaviour underneath it are ours.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/upstash", () => ({
  getRedis: () => ({ get: redisGet }),
}));

// A fixed events file: one unique event, one dated instance, and a pair that
// collapses to the same normalised key.
vi.mock("../data/events.json", () => ({
  default: {
    generatedAt: "2026-09-01T00:00:00Z",
    totalEvents: 4,
    events: [
      base({ slug: "annual-chamber-golf-outing" }),
      base({ slug: "business-brew-may-2026" }),
      base({ slug: "chamber-chat-2026" }),
      base({ slug: "chamber-chat-2027" }),
    ],
  },
}));

function base(over: Record<string, unknown>) {
  return {
    eventId: "e",
    title: "Event",
    dateISO: "2026-09-03",
    dayOfWeek: "Thursday",
    month: "September",
    day: 3,
    year: 2026,
    startTime: "",
    endTime: "",
    dateString: "",
    location: "",
    locationDesc: "",
    street: "",
    city: "Medina",
    state: "OH",
    zip: "44256",
    pricing: "",
    image: "",
    registerUrl: "",
    contactName: "",
    contactPhone: "",
    detailUrl: "",
    scrapedAt: "",
    ...over,
  };
}

const { getEventBySlug } = await import("@/data/events");
const { getPublicEventPhotos } = await import("./media-store");

describe("getEventBySlug tolerant fallback", () => {
  it("takes the exact match first, even when the normalised key is ambiguous", () => {
    expect(getEventBySlug("chamber-chat-2026")?.slug).toBe("chamber-chat-2026");
    expect(getEventBySlug("chamber-chat-2027")?.slug).toBe("chamber-chat-2027");
  });

  it("resolves a legacy slug whose year the scraper has since dropped", () => {
    expect(getEventBySlug("annual-chamber-golf-outing-2026")?.slug).toBe(
      "annual-chamber-golf-outing",
    );
  });

  it("tolerates casing and duplicated hyphens", () => {
    expect(getEventBySlug("Annual--Chamber-Golf-Outing")?.slug).toBe(
      "annual-chamber-golf-outing",
    );
  });

  it("refuses an ambiguous key rather than serving the wrong instance", () => {
    // Two dated instances normalise to "chamber-chat" — guessing between them
    // would silently show a visitor last year's event.
    expect(getEventBySlug("chamber-chat")).toBeUndefined();
  });

  it("still returns undefined for a slug that matches nothing", () => {
    expect(getEventBySlug("nope")).toBeUndefined();
  });
});

describe("getPublicEventPhotos", () => {
  beforeEach(() => {
    redisGet.mockReset();
  });

  it("falls back to the recurring type slug when the instance has no photos", async () => {
    redisGet.mockImplementation(async (key: string) =>
      key === "cms:media:event:business-brew" ? [{ url: "u" }] : null,
    );
    const photos = await getPublicEventPhotos("business-brew-may-2026");
    expect(photos.map((p) => p.url)).toEqual(["u"]);
  });

  it("degrades to an empty gallery when Redis throws", async () => {
    // A Redis outage must not 500 the public event page.
    redisGet.mockRejectedValue(new Error("ECONNRESET"));
    await expect(getPublicEventPhotos("annual-chamber-golf-outing")).resolves.toEqual([]);
  });
});

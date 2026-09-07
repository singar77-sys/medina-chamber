import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "./fake-redis";

/**
 * Concurrency cover for the media store.
 *
 * The bug this file exists for: photo metadata was one JSON array per key,
 * mutated GET → prepend → SET. Two uploads that overlap both read the same
 * "before" array and the second SET erases the first photo — every upload
 * returns 200, both blobs exist, and one photo is silently missing from the
 * gallery forever. The uploader worked around it by posting files one at a
 * time, but that is a client-side convention, not a server guarantee: two admin
 * tabs, two staff members, or an upload racing a delete all bring it back.
 *
 * The first test below reproduces the old pattern directly, so the regression
 * these tests guard is visible rather than asserted from memory.
 */

let redis: FakeRedis;

vi.mock("@/lib/upstash", () => ({ getRedis: () => redis }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const blobDel = vi.fn(async () => {});
vi.mock("@vercel/blob", () => ({
  put: async (pathname: string) => {
    // Mirror Blob's own latency so uploads genuinely overlap.
    await new Promise((r) => setTimeout(r, 0));
    return { url: `https://blob.test/${pathname}`, pathname };
  },
  del: (...args: unknown[]) => blobDel(...(args as [])),
}));

const {
  uploadMedia,
  getEventPhotos,
  getRecentMedia,
  deleteMediaItem,
  updateEventPhotoCaption,
  updateMediaItemMeta,
} = await import("./media-store");

type Item = Awaited<ReturnType<typeof uploadMedia>>;

function upload(name: string, eventSlug?: string) {
  return uploadMedia(Buffer.from(name), {
    pathname: `events/${eventSlug ?? "media"}/${name}.webp`,
    filename: `${name}.webp`,
    contentType: "image/webp",
    size: 1234,
    eventSlug,
    alt: `alt ${name}`,
  });
}

beforeEach(() => {
  redis = new FakeRedis();
  blobDel.mockClear();
});

describe("the lost-update pattern this store replaced", () => {
  it("drops one of two concurrent writers when the list is one JSON array", async () => {
    const key = "cms:media:event:demo";
    const oldAdd = async (item: { url: string }) => {
      const existing = (await redis.get<{ url: string }[]>(key)) ?? [];
      await redis.set(key, [item, ...existing]);
    };

    await Promise.all([oldAdd({ url: "a" }), oldAdd({ url: "b" })]);

    // Both writes reported success; only one record survived.
    expect((await redis.get<{ url: string }[]>(key))!).toHaveLength(1);
  });
});

describe("concurrent uploads", () => {
  it("retains BOTH photos in the event gallery", async () => {
    const [a, b] = await Promise.all([upload("one", "golf"), upload("two", "golf")]);

    const photos = await getEventPhotos("golf");
    expect(photos.map((p) => p.url).sort()).toEqual([a.url, b.url].sort());
  });

  it("retains BOTH photos in the global recent feed", async () => {
    const [a, b] = await Promise.all([upload("one", "golf"), upload("two", "golf")]);

    const recent = await getRecentMedia();
    expect(recent.map((p) => p.url).sort()).toEqual([a.url, b.url].sort());
  });

  it("keeps three-way overlapping uploads to different events apart", async () => {
    const [a, b, c] = await Promise.all([
      upload("one", "golf"),
      upload("two", "athena"),
      upload("three", "golf"),
    ]);

    expect((await getEventPhotos("golf")).map((p) => p.url).sort()).toEqual(
      [a.url, c.url].sort(),
    );
    expect((await getEventPhotos("athena")).map((p) => p.url)).toEqual([b.url]);
    expect(await getRecentMedia()).toHaveLength(3);
  });

  it("orders the gallery newest-first", async () => {
    const first = await upload("one", "golf");
    await new Promise((r) => setTimeout(r, 2));
    const second = await upload("two", "golf");

    expect((await getEventPhotos("golf")).map((p) => p.url)).toEqual([
      second.url,
      first.url,
    ]);
  });
});

describe("concurrent create and delete", () => {
  it("removes only the targeted photo while another upload lands", async () => {
    const doomed = await upload("doomed", "golf");
    const keeper = await upload("keeper", "golf");

    const [, fresh] = await Promise.all([
      deleteMediaItem(doomed.url, "golf"),
      upload("fresh", "golf"),
    ]);

    const urls = (await getEventPhotos("golf")).map((p) => p.url).sort();
    expect(urls).toEqual([keeper.url, fresh.url].sort());
    expect((await getRecentMedia()).map((p) => p.url).sort()).toEqual(
      [keeper.url, fresh.url].sort(),
    );
  });

  it("clears the photo from the event list and the recent feed together", async () => {
    const item = await upload("solo", "golf");
    await deleteMediaItem(item.url, "golf");

    expect(await getEventPhotos("golf")).toEqual([]);
    expect(await getRecentMedia()).toEqual([]);
    expect(blobDel).toHaveBeenCalledWith(item.url);
  });
});

describe("concurrent metadata edits", () => {
  it("applies a caption edit without disturbing a simultaneous upload", async () => {
    const existing = await upload("existing", "golf");

    const [, fresh] = await Promise.all([
      updateEventPhotoCaption("golf", existing.url, "Board photo"),
      upload("fresh", "golf"),
    ]);

    const photos = await getEventPhotos("golf");
    expect(photos).toHaveLength(2);
    expect(photos.find((p) => p.url === existing.url)?.caption).toBe("Board photo");
    expect(photos.find((p) => p.url === fresh.url)?.caption).toBeUndefined();
  });

  it("applies two edits to two different photos, losing neither", async () => {
    const a = await upload("a", "golf");
    const b = await upload("b", "golf");

    await Promise.all([
      updateMediaItemMeta(a.url, { alt: "alt A" }, "golf"),
      updateMediaItemMeta(b.url, { alt: "alt B" }, "golf"),
    ]);

    const photos = await getEventPhotos("golf");
    expect(photos.find((p) => p.url === a.url)?.alt).toBe("alt A");
    expect(photos.find((p) => p.url === b.url)?.alt).toBe("alt B");
  });
});

describe("legacy single-array keys", () => {
  const legacy: Item[] = [
    {
      url: "https://blob.test/legacy-new.webp",
      pathname: "legacy-new.webp",
      filename: "legacy-new.webp",
      size: 1,
      uploadedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      url: "https://blob.test/legacy-old.webp",
      pathname: "legacy-old.webp",
      filename: "legacy-old.webp",
      size: 1,
      uploadedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  it("still reads a gallery seeded in the old array shape", async () => {
    await redis.set("cms:media:event:seeded", legacy);
    expect((await getEventPhotos("seeded")).map((p) => p.filename)).toEqual([
      "legacy-new.webp",
      "legacy-old.webp",
    ]);
  });

  it("migrates the array on the next write, preserving order, and drops the old key", async () => {
    await redis.set("cms:media:event:seeded", legacy);
    await upload("fresh", "seeded");

    expect((await getEventPhotos("seeded")).map((p) => p.filename)).toEqual([
      "fresh.webp",
      "legacy-new.webp",
      "legacy-old.webp",
    ]);
    expect(await redis.get("cms:media:event:seeded")).toBeNull();
  });

  it("deletes a legacy-seeded photo instead of resurrecting the whole array", async () => {
    await redis.set("cms:media:event:seeded", legacy);
    await deleteMediaItem(legacy[0].url, "seeded");

    expect((await getEventPhotos("seeded")).map((p) => p.filename)).toEqual([
      "legacy-old.webp",
    ]);
  });

  /**
   * The delete above is SEQUENTIAL — it owns the migration. The dangerous case
   * is a delete that lands WHILE somebody else is migrating:
   *
   *   1. uploader  zcard = 0, begins migrating, GETs the legacy array [new, old]
   *   2. deleter   migrates it itself, then removes `new`
   *   3. uploader  writes its stale [new, old] snapshot back
   *
   * `new` is back in the gallery, and the delete had already removed its blob,
   * so the public event page renders a card pointing at a URL that 404s. The
   * migration is mutually exclusive now, so the delete is REFUSED (changing
   * nothing, blob included) instead of half-succeeding.
   */
  it("refuses a delete mid-migration rather than resurrecting the photo", async () => {
    await redis.set("cms:media:event:seeded", legacy);

    // Pin the uploader the moment it has the legacy array in hand, then run the
    // delete against that exact state. Hoping the scheduler produces this
    // interleaving is how it stayed invisible.
    let release!: () => void;
    const paused = new Promise<void>((resolve) => (release = resolve));
    let reached!: () => void;
    const holdingSnapshot = new Promise<void>((resolve) => (reached = resolve));

    redis.hook = (op, key) => {
      if (op === "get" && key === "cms:media:event:seeded") {
        redis.hook = undefined; // once
        reached();
        return paused;
      }
    };

    const uploading = upload("fresh", "seeded");
    await holdingSnapshot;

    await expect(deleteMediaItem(legacy[0].url, "seeded")).rejects.toThrow(
      /still migrating/i,
    );
    // Nothing was changed — including the blob, which used to be deleted first.
    expect(blobDel).not.toHaveBeenCalled();

    release();
    await uploading;

    // The migration finished cleanly and the retry now works.
    await deleteMediaItem(legacy[0].url, "seeded");
    const gallery = (await getEventPhotos("seeded")).map((p) => p.filename);
    expect(gallery).not.toContain("legacy-new.webp");
    expect(gallery).toEqual(["fresh.webp", "legacy-old.webp"]);
  }, 20_000);

  it("gives a URL repeated in a legacy array ONE slot, at its first position", async () => {
    // The body map already deduped; the ZSET entries did not, so the second
    // (lower-scored) copy won and quietly demoted the photo.
    await redis.set("cms:media:event:dupes", [legacy[0], legacy[1], legacy[0]]);
    await upload("fresh", "dupes");

    expect((await getEventPhotos("dupes")).map((p) => p.filename)).toEqual([
      "fresh.webp",
      "legacy-new.webp",
      "legacy-old.webp",
    ]);
  });
});

describe("recent feed cap", () => {
  it("keeps the newest 50 and evicts the oldest", async () => {
    for (let i = 0; i < 52; i++) {
      await uploadMedia(Buffer.from("x"), {
        pathname: `media/p${i}.webp`,
        filename: `p${i}.webp`,
        contentType: "image/webp",
        size: 1,
      });
    }

    const recent = await getRecentMedia(100);
    expect(recent).toHaveLength(50);
    expect(recent[0].filename).toBe("p51.webp");
    expect(recent.some((p) => p.filename === "p0.webp")).toBe(false);
    // The evicted bodies go too — no orphaned hash fields left behind.
    expect(Object.keys((await redis.hgetall("cms:media:recent:items")) ?? {})).toHaveLength(
      50,
    );
  });
});

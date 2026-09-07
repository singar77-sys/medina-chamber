import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "./fake-redis";

/**
 * The CMS blog index had the same lost-update shape as the media store: post
 * bodies were keyed individually (safe), but the list of published slugs was a
 * single JSON array read-modify-written on every save. Two posts published in
 * the same window both persisted their bodies while the index kept only one
 * slug — the other post existed at its URL but never appeared on /blog.
 */

let redis: FakeRedis;

vi.mock("@/lib/upstash", () => ({ getRedis: () => redis }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const { saveCmsBlogPost, deleteCmsBlogPost, listCmsBlogPosts, getCmsBlogPost } =
  await import("./cms-store");

type Post = Parameters<typeof saveCmsBlogPost>[0];

function post(slug: string, createdAt = "2026-09-01T00:00:00.000Z"): Post {
  return {
    slug,
    title: `Title ${slug}`,
    excerpt: "excerpt",
    body: "body",
    author: "Chamber",
    dateISO: "2026-09-01",
    image: "",
    createdAt,
    updatedAt: createdAt,
  };
}

beforeEach(() => {
  redis = new FakeRedis();
});

describe("concurrent publishes", () => {
  it("keeps BOTH posts reachable from the index", async () => {
    await Promise.all([saveCmsBlogPost(post("alpha")), saveCmsBlogPost(post("beta"))]);

    const slugs = (await listCmsBlogPosts()).map((p) => p.slug).sort();
    expect(slugs).toEqual(["alpha", "beta"]);
  });

  it("keeps a publish and an unrelated delete from cancelling each other", async () => {
    await saveCmsBlogPost(post("doomed"));
    await saveCmsBlogPost(post("keeper"));

    await Promise.all([deleteCmsBlogPost("doomed"), saveCmsBlogPost(post("fresh"))]);

    const slugs = (await listCmsBlogPosts()).map((p) => p.slug).sort();
    expect(slugs).toEqual(["fresh", "keeper"]);
    expect(await getCmsBlogPost("doomed")).toBeNull();
  });

  it("orders newest-first by createdAt and does not reshuffle on re-edit", async () => {
    await saveCmsBlogPost(post("older", "2026-01-01T00:00:00.000Z"));
    await saveCmsBlogPost(post("newer", "2026-06-01T00:00:00.000Z"));

    expect((await listCmsBlogPosts()).map((p) => p.slug)).toEqual(["newer", "older"]);

    // Re-saving "older" (an edit) must not promote it to the top.
    await saveCmsBlogPost({
      ...post("older", "2026-01-01T00:00:00.000Z"),
      title: "Edited",
      updatedAt: "2026-09-07T00:00:00.000Z",
    });
    expect((await listCmsBlogPosts()).map((p) => p.slug)).toEqual(["newer", "older"]);
  });
});

describe("legacy array index", () => {
  it("still lists posts recorded in the old shape", async () => {
    await redis.set("cms:blog:post:one", post("one"));
    await redis.set("cms:blog:post:two", post("two"));
    await redis.set("cms:blog:index", ["one", "two"]);

    expect((await listCmsBlogPosts()).map((p) => p.slug)).toEqual(["one", "two"]);
  });

  it("migrates the array on the next publish, preserving order, and drops the old key", async () => {
    await redis.set("cms:blog:post:one", post("one"));
    await redis.set("cms:blog:post:two", post("two"));
    await redis.set("cms:blog:index", ["one", "two"]);

    await saveCmsBlogPost(post("three", "2026-09-07T00:00:00.000Z"));

    expect((await listCmsBlogPosts()).map((p) => p.slug)).toEqual([
      "three",
      "one",
      "two",
    ]);
    expect(await redis.get("cms:blog:index")).toBeNull();
  });

  /**
   * Migrated slugs are scored by array POSITION (1..n); every publish after the
   * migration is scored in epoch ms (~1.7e12). Re-scoring a post on save
   * therefore vaulted the first pre-existing post anyone edited above every
   * other legacy post, whatever its date — the exact reshuffle blogScore's
   * comment promises cannot happen. A slug is scored once, on first publish.
   */
  it("an EDIT of a migrated post leaves it exactly where it was", async () => {
    await redis.set("cms:blog:post:one", post("one"));
    await redis.set("cms:blog:post:two", post("two"));
    await redis.set("cms:blog:post:three", post("three"));
    await redis.set("cms:blog:index", ["one", "two", "three"]);

    // Fix a typo in the OLDEST post. It must not jump to the top of /blog.
    await saveCmsBlogPost({ ...post("three"), title: "Edited" });

    expect((await listCmsBlogPosts()).map((p) => p.slug)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect((await getCmsBlogPost("three"))?.title).toBe("Edited");
  });

  it("gives a slug repeated in the legacy array ONE slot, at its first position", async () => {
    await redis.set("cms:blog:post:one", post("one"));
    await redis.set("cms:blog:post:two", post("two"));
    await redis.set("cms:blog:index", ["one", "two", "one"]);

    await saveCmsBlogPost(post("three", "2026-09-07T00:00:00.000Z"));

    expect((await listCmsBlogPosts()).map((p) => p.slug)).toEqual([
      "three",
      "one",
      "two",
    ]);
  });
});

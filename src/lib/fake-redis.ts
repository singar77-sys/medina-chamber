/**
 * TEST-ONLY in-memory stand-in for the subset of Upstash Redis the CMS/media
 * stores use. Not imported by any runtime code.
 *
 * Every operation yields to the macrotask queue before touching state. That is
 * the whole point: it opens a real interleaving window between a read and its
 * follow-up write, so a lost-update race in the store reproduces deterministically
 * instead of depending on network timing that a unit test can never reproduce.
 */

type ZEntry = { score: number; member: string };
type ZAddOpts = { nx?: boolean; xx?: boolean };

export class FakeRedis {
  strings = new Map<string, unknown>();
  /** Recorded for assertions; nothing here actually expires. */
  ttls = new Map<string, number>();
  hashes = new Map<string, Map<string, unknown>>();
  zsets = new Map<string, Map<string, number>>();
  counters = new Map<string, number>();

  /**
   * Test hook, awaited AFTER an operation has read or written state and just
   * before it returns. Returning a pending promise pins that caller exactly
   * where it is, which is how a test drives one specific interleaving instead
   * of hoping the scheduler produces it — e.g. "the uploader is holding a stale
   * copy of the legacy array; now let the delete run to completion".
   */
  hook?: (op: string, key: string) => void | Promise<void>;

  /** Yield the event loop so concurrent callers actually interleave. */
  private tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Suspension point offered to the test hook. */
  private async done(op: string, key: string): Promise<void> {
    if (this.hook) await this.hook(op, key);
  }

  async get<T>(key: string): Promise<T | null> {
    await this.tick();
    const value = (this.strings.get(key) as T) ?? null;
    await this.done("get", key);
    return value;
  }

  /** Supports the NX / EX options the stores use for the one-time migration
   *  lock. NX is what makes the lock a lock: the second caller gets null and
   *  must wait rather than migrating a list somebody else is mid-way through.
   *  EX is accepted and recorded but not expired — a unit test that needed a
   *  30-second TTL to fire would be a test of setTimeout, not of the store. */
  async set(
    key: string,
    value: unknown,
    opts?: { nx?: boolean; ex?: number },
  ): Promise<string | null> {
    await this.tick();
    if (opts?.nx && this.strings.has(key)) {
      await this.done("set", key);
      return null;
    }
    this.strings.set(key, value);
    if (opts?.ex !== undefined) this.ttls.set(key, opts.ex);
    await this.done("set", key);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    await this.tick();
    let n = 0;
    for (const key of keys) {
      this.ttls.delete(key);
      if (this.strings.delete(key)) n++;
      if (this.hashes.delete(key)) n++;
      if (this.zsets.delete(key)) n++;
      await this.done("del", key);
    }
    return n;
  }

  async incr(key: string): Promise<number> {
    await this.tick();
    const next = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, next);
    return next;
  }

  // ── hash ────────────────────────────────────────────────────────────────
  async hset(key: string, obj: Record<string, unknown>): Promise<number> {
    await this.tick();
    const h = this.hashes.get(key) ?? new Map<string, unknown>();
    this.hashes.set(key, h);
    for (const [field, value] of Object.entries(obj)) h.set(field, value);
    await this.done("hset", key);
    return Object.keys(obj).length;
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    await this.tick();
    return (this.hashes.get(key)?.get(field) as T) ?? null;
  }

  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    await this.tick();
    const h = this.hashes.get(key);
    if (!h || h.size === 0) return null;
    return Object.fromEntries(h) as T;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    await this.tick();
    const h = this.hashes.get(key);
    if (!h) return 0;
    let n = 0;
    for (const f of fields) if (h.delete(f)) n++;
    return n;
  }

  // ── sorted set ──────────────────────────────────────────────────────────
  /** Accepts Upstash's optional leading options object. `nx` matters: the blog
   *  index scores a slug once, on first publish, so an edit cannot move it. */
  async zadd(key: string, ...args: (ZAddOpts | ZEntry)[]): Promise<number> {
    await this.tick();
    const first = args[0];
    const opts = first && !("member" in first) ? (first as ZAddOpts) : undefined;
    const entries = (opts ? args.slice(1) : args) as ZEntry[];
    const z = this.zsets.get(key) ?? new Map<string, number>();
    this.zsets.set(key, z);
    let n = 0;
    for (const e of entries) {
      if (opts?.nx && z.has(e.member)) continue;
      z.set(e.member, e.score);
      n++;
    }
    await this.done("zadd", key);
    return n;
  }

  async zscore(key: string, member: string): Promise<number | null> {
    await this.tick();
    return this.zsets.get(key)?.get(member) ?? null;
  }

  async zcard(key: string): Promise<number> {
    await this.tick();
    const size = this.zsets.get(key)?.size ?? 0;
    await this.done("zcard", key);
    return size;
  }

  /** Rank-based ZRANGE. `rev` reverses the ordering BEFORE the rank slice,
   *  matching Redis. Ties break on member, like Redis' lexicographic rule. */
  async zrange<T extends unknown[]>(
    key: string,
    start: number,
    stop: number,
    opts?: { rev?: boolean },
  ): Promise<T> {
    await this.tick();
    const sorted = [...(this.zsets.get(key) ?? new Map<string, number>())].sort(
      (a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1),
    );
    if (opts?.rev) sorted.reverse();
    const members = sorted.map(([m]) => m);
    const n = members.length;
    const from = start < 0 ? Math.max(n + start, 0) : start;
    const to = stop < 0 ? n + stop : Math.min(stop, n - 1);
    return (from > to ? [] : members.slice(from, to + 1)) as T;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    await this.tick();
    const z = this.zsets.get(key);
    if (!z) return 0;
    let n = 0;
    for (const m of members) if (z.delete(m)) n++;
    await this.done("zrem", key);
    return n;
  }
}

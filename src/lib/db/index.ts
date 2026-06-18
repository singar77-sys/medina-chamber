import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazily-constructed Drizzle client.
 *
 * Constructing `postgres(url)` (and throwing on a missing DATABASE_URL) at
 * module load broke `next build`: during "Collecting page data" Next imports
 * route modules (portal/auth, portal/checkout, etc.) which import this one, so
 * the eager throw aborted the production build whenever DATABASE_URL wasn't in
 * the build environment — the same anti-pattern that broke the build via the
 * Stripe client.
 *
 * The Proxy defers both the postgres connection and the missing-url error until
 * the client is actually USED at request time. Importing this module is now
 * side-effect-free (no env read, no socket, no throw), so it never affects the
 * build; only a real query (e.g. db.select(...)) errors if DATABASE_URL is
 * absent. The exported name + shape (db.select/insert/update/transaction/query)
 * are unchanged for callers/tests.
 */
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

// Supabase transaction-mode pooler requires prepare:false.
// Dev: use a global singleton to avoid exhausting connections on hot reload.
const globalForDb = globalThis as unknown as {
  _pgClient: ReturnType<typeof postgres> | undefined;
};

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  return postgres(url, {
    prepare: false, // required for Supabase pgBouncer transaction mode
    max: 1,         // serverless: one connection per function invocation
  });
}

let instance: DrizzleClient | null = null;

function drizzleClient(): DrizzleClient {
  if (instance) return instance;
  const client = globalForDb._pgClient ?? createClient();
  if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;
  instance = drizzle(client, { schema });
  return instance;
}

export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop) {
    const c = drizzleClient();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});

export type DB = typeof db;

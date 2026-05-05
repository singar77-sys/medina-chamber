import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Supabase transaction-mode pooler requires prepare:false
// Dev: use a global singleton to avoid exhausting connections on hot reload
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

const client = globalForDb._pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb._pgClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;

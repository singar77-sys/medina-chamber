import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use the UNPOOLED url for migrations (direct connection, not pgBouncer)
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  // Only touch the public schema — ignore Supabase's internal auth/storage/realtime schemas
  schemaFilter: ["public"],
} satisfies Config;

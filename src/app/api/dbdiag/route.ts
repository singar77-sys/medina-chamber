import { NextResponse } from "next/server";

// TEMPORARY diagnostic — lists DB-related env var KEYS present at runtime and,
// for each candidate connection-string var, whether it parses as a URL + its
// host (NO passwords, NO full values). Remove after diagnosing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function describe(u?: string): string {
  if (!u) return "(unset)";
  try {
    const url = new URL(u);
    return `VALID host=${url.hostname} port=${url.port || "(none)"} user=${url.username || "(none)"}`;
  } catch {
    return `INVALID-URL len=${u.length} starts="${u.slice(0, 14)}"`;
  }
}

export async function GET() {
  const dbEnvKeys = Object.keys(process.env)
    .filter((k) => /DATABASE|POSTGRES|SUPABASE|NEON|PGHOST|PG_/i.test(k))
    .sort();

  const candidates = [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_URL_NO_SSL",
  ];
  const urls: Record<string, string> = {};
  for (const k of candidates) urls[k] = describe(process.env[k]);

  return NextResponse.json({ dbEnvKeys, urls });
}

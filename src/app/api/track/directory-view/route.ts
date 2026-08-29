/**
 * POST /api/track/directory-view — log a directory_view for a member listing.
 *
 * Fed by the client-side DirectoryViewBeacon (fires once on real browser mount),
 * so bots and Next link-prefetches — which don't run JS — never inflate the
 * count. Resolves the org server-side from the slug; rate-limited (degrades to
 * per-isolate in-memory limiting if Upstash is absent; never disables limiting);
 * the whole lookup+log is best-effort, so a DB hiccup returns ok, never a 500.
 */

import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { applyRateLimit, trackLimiter } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/body-limit";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { logEngagement } from "@/lib/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  // Beacon traffic gets its own budget (rl:track) — sharing formLimiter meant
  // browsing 5 member listings blocked the visitor's contact-form submission.
  const limited = await applyRateLimit(req, trackLimiter);
  if (limited) return limited;

  let slug = "";
  const bounded = await readJsonBounded(req, 4 * 1024);
  if ("response" in bounded) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const body = bounded.body as { slug?: unknown };
  if (typeof body?.slug === "string") slug = body.slug;
  // Real member slugs are short lowercase-hyphen strings; an unbounded value
  // would otherwise flow into the DB lookup and engagement metadata as-is.
  if (!slug || slug.length > 120) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const [org] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.slug, slug),
          eq(organizations.status, "active"),
          isNull(organizations.deletedAt),
        ),
      )
      .limit(1);

    if (org) {
      await logEngagement(db, { eventType: "directory_view", organizationId: org.id, metadata: { slug } });
    }
  } catch (err) {
    console.error("[track/directory-view] failed:", err);
  }
  return NextResponse.json({ ok: true });
}

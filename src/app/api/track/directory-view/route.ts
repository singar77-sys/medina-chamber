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
  try {
    const body = (await req.json()) as { slug?: unknown };
    if (typeof body?.slug === "string") slug = body.slug;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });

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

/**
 * GET /go/org/[slug] — tracked click-through to a member's website.
 *
 * Logs referral_click (member-ROI "visibility" signal), then 302s to the org's
 * website. The destination is looked up server-side from the DB (never the
 * query) and re-validated to http(s), so it's not an open redirect. Unknown /
 * inactive slug or no website → back to the directory.
 */

import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { logEngagement } from "@/lib/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeHttpUrl(u: string | null): string | null {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const origin = new URL(req.url).origin;
  const back = NextResponse.redirect(`${origin}/membership/directory`, 302);

  const [org] = await db
    .select({ id: organizations.id, websiteUrl: organizations.websiteUrl })
    .from(organizations)
    .where(
      and(
        eq(organizations.slug, slug),
        eq(organizations.status, "active"),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1);

  const dest = org ? safeHttpUrl(org.websiteUrl) : null;
  if (!org || !dest) return back;

  await logEngagement(db, {
    eventType: "referral_click",
    organizationId: org.id,
    metadata: { slug, destination: dest },
  });
  return NextResponse.redirect(dest, 302);
}

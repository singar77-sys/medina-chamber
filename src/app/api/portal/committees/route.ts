/**
 * POST /api/portal/committees — a logged-in member joins or leaves a committee.
 *
 * Body: { committeeId: string, join: boolean }. Identity (organizationId +
 * contactId) comes ONLY from the HMAC-verified portal_session cookie — never the
 * body — so a crafted request can't enroll another org. Self-join is allowed
 * only for public + active committees; leave is always allowed (idempotent).
 */

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { committees } from "@/lib/db/schema";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { limitPortalProfile } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/csrf";
import { joinCommittee, leaveCommittee } from "@/lib/committees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSession() {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export async function POST(req: Request): Promise<Response> {
  const limited = await limitPortalProfile(req);
  if (limited) return limited;

  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const session = await getSession();
  if (!session) return Response.json({ error: "Not signed in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const committeeId = typeof body.committeeId === "string" ? body.committeeId : null;
  if (!committeeId) return Response.json({ error: "committeeId is required." }, { status: 400 });

  if (body.join === true) {
    // Members may only self-join a committee that is public + active.
    const [c] = await db
      .select({ id: committees.id })
      .from(committees)
      .where(
        and(eq(committees.id, committeeId), eq(committees.isPublic, true), eq(committees.isActive, true)),
      )
      .limit(1);
    if (!c) return Response.json({ error: "That committee isn't open to join." }, { status: 404 });

    const changed = await joinCommittee(db, committeeId, session.organizationId, session.contactId);
    return Response.json({ joined: true, changed });
  }

  const changed = await leaveCommittee(db, committeeId, session.organizationId);
  return Response.json({ joined: false, changed });
}

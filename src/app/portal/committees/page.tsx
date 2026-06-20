/**
 * /portal/committees — a member browses committees and joins/leaves.
 * Server Component: verifies the portal session, then renders the portal shell
 * + the join/leave island. Identity for writes comes from the session cookie.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { getPublicCommittees, getMemberCommitteeIds } from "@/lib/committees";
import { CommitteesJoin } from "@/components/portal/CommitteesJoin";

export const dynamic = "force-dynamic";

async function getSession() {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export default async function PortalCommitteesPage() {
  const session = await getSession();
  if (!session) redirect("/portal");

  const [committees, joinedIds] = await Promise.all([
    getPublicCommittees(db),
    getMemberCommitteeIds(db, session.organizationId),
  ]);

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 shrink-0"
        style={{ background: "#0C1B33", borderBottom: "1px solid rgba(255,255,255,.08)" }}
      >
        <a href="/portal/dashboard" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/chamber-logos/icon-white.png" alt="Medina Chamber" className="w-7 h-7" />
          <span className="text-white text-sm font-bold hidden sm:block">Member Portal</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/portal/dashboard" className="text-sm hover:underline" style={{ color: "#83BCA9" }}>
            Dashboard
          </a>
          <form action="/api/portal/auth/logout" method="post">
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "rgba(255,255,255,.08)", color: "#cbd5e1" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Committees</h1>
          <p className="text-text-secondary text-sm mt-1">
            Get involved — join a committee to help shape chamber programs and build relationships.
          </p>
        </div>

        <CommitteesJoin
          committees={committees.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            meetingSchedule: c.meetingSchedule,
            memberCount: c.memberCount,
          }))}
          joinedIds={joinedIds}
        />
      </main>

      <footer className="text-center py-6 mt-4">
        <p className="text-xs text-text-tertiary">
          Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
        </p>
      </footer>
    </div>
  );
}

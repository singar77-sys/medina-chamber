/**
 * /portal/reporting — a member's "your chamber ROI" summary, read-only.
 * Counts this org's engagement events (last 90 days) into the fixed ROI cards.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { getMemberEngagement, buildMemberRoiCards } from "@/lib/engagement-stats";

export const dynamic = "force-dynamic";

async function getSession() {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export default async function PortalReportingPage() {
  const session = await getSession();
  if (!session) redirect("/portal");

  let cards = buildMemberRoiCards([]);
  let total = 0;
  try {
    const stats = await getMemberEngagement(db, session.organizationId, 90);
    cards = buildMemberRoiCards(stats.byType);
    total = stats.total;
  } catch (err) {
    console.error("[portal/reporting] load failed:", err);
  }

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
          <h1 className="text-2xl font-bold text-text-primary">Your Chamber Engagement</h1>
          <p className="text-text-secondary text-sm mt-1">
            How people have engaged with your business through the chamber — last 90 days.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <div
              key={c.type}
              className="p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <p className="text-3xl font-bold text-text-primary">{c.count}</p>
              <p className="text-sm text-text-secondary mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {total === 0 && (
          <p className="text-sm text-text-secondary mt-5">
            No activity recorded yet — these numbers grow as members attend events you&apos;re part
            of and visitors click through your deals.
          </p>
        )}

        <p className="text-xs text-text-tertiary mt-6 leading-relaxed">
          Engagement tracking began June 2026, so totals build over time. Directory views and
          website click-throughs are coming soon, once the member directory moves onto the chamber&apos;s
          new platform.
        </p>
      </main>

      <footer className="text-center py-6 mt-4">
        <p className="text-xs text-text-tertiary">
          Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
        </p>
      </footer>
    </div>
  );
}

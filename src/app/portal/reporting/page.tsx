/**
 * /portal/reporting — a member's "your chamber ROI" summary, read-only.
 * Counts this org's engagement events (last 90 days) into the fixed ROI cards.
 */

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readPortalSession } from "@/lib/portal-session";
import { getMemberEngagement, buildMemberRoiCards } from "@/lib/engagement-stats";
import { PortalTopBar } from "@/components/portal/PortalTopBar";

export const dynamic = "force-dynamic";

export default async function PortalReportingPage() {
  const session = await readPortalSession();
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
      <PortalTopBar links={[{ href: "/portal/dashboard", label: "Dashboard" }]} />

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

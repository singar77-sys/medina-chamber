/**
 * /portal/deals — a member posts and manages their own hot deals.
 * Server Component: verifies the session, loads the org's deals, renders the
 * portal shell + the DealsManager island.
 */

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readPortalSession } from "@/lib/portal-session";
import { getMemberDeals } from "@/lib/deals";
import { DealsManager, type DealRow } from "@/components/portal/DealsManager";
import { PortalTopBar } from "@/components/portal/PortalTopBar";

export const dynamic = "force-dynamic";

export default async function PortalDealsPage() {
  const session = await readPortalSession();
  if (!session) redirect("/portal");

  let deals: DealRow[] = [];
  try {
    const rows = await getMemberDeals(db, session.organizationId);
    deals = rows.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      terms: d.terms,
      discountLabel: d.discountLabel,
      redemptionInstructions: d.redemptionInstructions,
      dealUrl: d.dealUrl,
      startsAt: d.startsAt,
      endsAt: d.endsAt,
      isActive: d.isActive,
      isApproved: d.isApproved,
    }));
  } catch (err) {
    // hot_deals (migration 0005) may not be applied yet — degrade gracefully.
    console.error("[portal/deals] load failed:", err);
  }

  return (
    <div className="min-h-full flex flex-col">
      <PortalTopBar links={[{ href: "/portal/dashboard", label: "Dashboard" }]} />

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Member Deals</h1>
          <p className="text-text-secondary text-sm mt-1">
            Post a deal to promote your business on the chamber&apos;s public deals page — a free
            member benefit.
          </p>
        </div>

        <DealsManager deals={deals} />
      </main>

      <footer className="text-center py-6 mt-4">
        <p className="text-xs text-text-tertiary">
          Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
        </p>
      </footer>
    </div>
  );
}

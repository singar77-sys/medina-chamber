/**
 * /portal/deals — a member posts and manages their own hot deals.
 * Server Component: verifies the session, loads the org's deals, renders the
 * portal shell + the DealsManager island.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { getMemberDeals } from "@/lib/deals";
import { DealsManager, type DealRow } from "@/components/portal/DealsManager";

export const dynamic = "force-dynamic";

async function getSession() {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

export default async function PortalDealsPage() {
  const session = await getSession();
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

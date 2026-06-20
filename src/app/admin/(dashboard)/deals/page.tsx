import { db } from "@/lib/db";
import { getAdminDeals } from "@/lib/deals";
import { DealsModeration, type AdminDealRow } from "@/components/admin/DealsModeration";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  let rows: Awaited<ReturnType<typeof getAdminDeals>> = [];
  try {
    rows = await getAdminDeals(db);
  } catch (err) {
    // hot_deals (migration 0005) may not be applied yet — degrade gracefully.
    console.error("[admin/deals] load failed:", err);
  }

  const deals: AdminDealRow[] = rows.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    discountLabel: d.discountLabel,
    orgName: d.orgName,
    isActive: d.isActive,
    isApproved: d.isApproved,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    dealUrl: d.dealUrl,
    terms: d.terms,
    redemptionInstructions: d.redemptionInstructions,
  }));

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Member Deals</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Moderate member-submitted deals — pending shown first. Approved + active + in-date deals
          appear on the public /deals page.
        </p>
      </div>

      <DealsModeration deals={deals} />
    </div>
  );
}

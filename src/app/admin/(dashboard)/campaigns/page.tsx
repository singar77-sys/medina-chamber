import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailCampaigns } from "@/lib/db/schema";
import { CampaignsTable, type CampaignRow } from "@/components/admin/CampaignsTable";

export const dynamic = "force-dynamic";

async function loadCampaigns(): Promise<CampaignRow[]> {
  try {
    const rows = await db
      .select({
        id: emailCampaigns.id,
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        status: emailCampaigns.status,
        recipientCount: emailCampaigns.recipientCount,
        sentCount: emailCampaigns.sentCount,
        openCount: emailCampaigns.openCount,
        clickCount: emailCampaigns.clickCount,
        unsubscribeCount: emailCampaigns.unsubscribeCount,
        bounceCount: emailCampaigns.bounceCount,
        sentAt: emailCampaigns.sentAt,
        createdAt: emailCampaigns.createdAt,
      })
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt));

    return rows.map((r) => ({
      ...r,
      sentAt: r.sentAt ? r.sentAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[admin/campaigns] load failed:", err);
    return [];
  }
}

export default async function CampaignsPage() {
  const campaigns = await loadCampaigns();

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Email Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Compose and send newsletters to members — replaces GrowthZone email.
          </p>
        </div>
        <Link
          href="/admin/campaigns/new"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-80"
          style={{ background: "#0C1B33" }}
        >
          + New campaign
        </Link>
      </div>

      <CampaignsTable campaigns={campaigns} />
    </div>
  );
}

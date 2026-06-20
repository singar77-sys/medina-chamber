import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailCampaigns, emailSends } from "@/lib/db/schema";
import { getActiveTiers } from "@/lib/membership-tiers";
import { CampaignComposer, type CampaignData } from "@/components/admin/CampaignComposer";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";

  const [row] = await db
    .select()
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, id))
    .limit(1);
  if (!row) notFound();

  // Delivery failures for this campaign (so the results panel can flag a
  // partially-failed blast rather than showing it as a clean "sent").
  const [failed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailSends)
    .where(and(eq(emailSends.campaignId, id), eq(emailSends.status, "failed")));

  const tiers = await getActiveTiers();
  const tierOptions = tiers.map((t) => ({ value: t.key, label: t.name }));

  const campaign: CampaignData = {
    id: row.id,
    name: row.name,
    subject: row.subject,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    htmlBody: row.htmlBody,
    segmentFilter: row.segmentFilter,
    status: row.status,
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    openCount: row.openCount,
    clickCount: row.clickCount,
    bounceCount: row.bounceCount,
    unsubscribeCount: row.unsubscribeCount,
    failedCount: failed?.count ?? 0,
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
  };

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <Link href="/admin/campaigns" className="text-xs text-gray-400 hover:text-gray-600">
          ← Campaigns
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">{row.name}</h1>
      </div>

      <CampaignComposer adminToken={adminToken} tierOptions={tierOptions} campaign={campaign} />
    </div>
  );
}

import Link from "next/link";
import { getActiveTiers } from "@/lib/membership-tiers";
import { CampaignComposer } from "@/components/admin/CampaignComposer";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";
  const tiers = await getActiveTiers();
  const tierOptions = tiers.map((t) => ({ value: t.key, label: t.name }));

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <Link href="/admin/campaigns" className="text-xs text-gray-400 hover:text-gray-600">
          ← Campaigns
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">New campaign</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Save as a draft, then send when you&apos;re ready.
        </p>
      </div>

      <CampaignComposer adminToken={adminToken} tierOptions={tierOptions} />
    </div>
  );
}

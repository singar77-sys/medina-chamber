import { db } from "@/lib/db";
import { getSponsorships } from "@/lib/sponsorships";
import { SponsorshipQueue, type SponsorshipInquiry } from "@/components/admin/SponsorshipQueue";

export const dynamic = "force-dynamic";

export default async function AdminSponsorshipsPage() {
  let rows: Awaited<ReturnType<typeof getSponsorships>> = [];
  try {
    rows = await getSponsorships(db);
  } catch (err) {
    // sponsorship_inquiries (migration 0006) may not be applied yet — degrade gracefully.
    console.error("[admin/sponsorships] load failed:", err);
  }

  const inquiries: SponsorshipInquiry[] = rows.map((r) => ({
    id: r.id,
    businessName: r.businessName,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    interest: r.interest,
    message: r.message,
    status: r.status,
    staffNote: r.staffNote,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Sponsorship Inquiries</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Leads from the public sponsorship page — newest and unworked first. Move each through the
          pipeline and keep an internal note.
        </p>
      </div>

      <SponsorshipQueue initial={inquiries} />
    </div>
  );
}

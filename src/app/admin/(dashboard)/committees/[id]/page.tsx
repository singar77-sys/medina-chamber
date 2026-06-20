import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { committees } from "@/lib/db/schema";
import { getCommitteeRoster } from "@/lib/committees";
import { CommitteeEditor, type CommitteeData, type RosterRow } from "@/components/admin/CommitteeEditor";

export const dynamic = "force-dynamic";

export default async function CommitteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [row] = await db.select().from(committees).where(eq(committees.id, id)).limit(1);
  if (!row) notFound();

  const roster = await getCommitteeRoster(db, id);

  const committee: CommitteeData = {
    id: row.id,
    name: row.name,
    description: row.description,
    meetingSchedule: row.meetingSchedule,
    isPublic: row.isPublic,
    isActive: row.isActive,
  };
  const rosterRows: RosterRow[] = roster.map((r) => ({
    memberId: r.memberId,
    role: r.role,
    orgName: r.orgName,
    contactName: r.contactName,
    contactEmail: r.contactEmail,
    joinedAt: r.joinedAt.toISOString(),
  }));

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <Link href="/admin/committees" className="text-xs text-gray-400 hover:text-gray-600">
          ← Committees
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">{row.name}</h1>
      </div>

      <CommitteeEditor committee={committee} roster={rosterRows} />
    </div>
  );
}

import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { committees, committeeMembers } from "@/lib/db/schema";
import { CommitteesManager, type CommitteeRow } from "@/components/admin/CommitteesManager";

export const dynamic = "force-dynamic";

async function loadCommittees(): Promise<CommitteeRow[]> {
  try {
    return await db
      .select({
        id: committees.id,
        name: committees.name,
        slug: committees.slug,
        description: committees.description,
        meetingSchedule: committees.meetingSchedule,
        isPublic: committees.isPublic,
        isActive: committees.isActive,
        memberCount: sql<number>`coalesce(count(${committeeMembers.id}) filter (where ${committeeMembers.leftAt} is null), 0)::int`,
      })
      .from(committees)
      .leftJoin(committeeMembers, eq(committeeMembers.committeeId, committees.id))
      .groupBy(committees.id)
      .orderBy(asc(committees.name));
  } catch (err) {
    console.error("[admin/committees] load failed:", err);
    return [];
  }
}

export default async function AdminCommitteesPage() {
  const list = await loadCommittees();

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Committees</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage chamber committees + working groups. Members join from their portal; the public
          /committees page shows active, public ones.
        </p>
      </div>

      <CommitteesManager committees={list} />
    </div>
  );
}

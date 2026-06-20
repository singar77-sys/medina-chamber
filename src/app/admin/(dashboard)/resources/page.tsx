import { db } from "@/lib/db";
import { getAdminResources } from "@/lib/resources";
import { ResourcesManager, type AdminResource } from "@/components/admin/ResourcesManager";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  let rows: Awaited<ReturnType<typeof getAdminResources>> = [];
  try {
    rows = await getAdminResources(db);
  } catch (err) {
    // resources (migration 0007) may not be applied yet — degrade gracefully.
    console.error("[admin/resources] load failed:", err);
  }

  const resources: AdminResource[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    url: r.url,
    linkLabel: r.linkLabel,
    isMemberOnly: r.isMemberOnly,
    isPublished: r.isPublished,
    sortOrder: r.sortOrder,
  }));

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Resource Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Curate the links and documents on the public Resource Library page. Members-only resources
          appear in the member portal instead of the public page.
        </p>
      </div>

      <ResourcesManager initial={resources} />
    </div>
  );
}

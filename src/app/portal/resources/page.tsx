/**
 * /portal/resources — members browse the resource library, including
 * members-only resources hidden from the public page. Read-only server component.
 */

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readPortalSession } from "@/lib/portal-session";
import { getMemberResources, groupByCategory, type Resource } from "@/lib/resources";
import { PortalTopBar } from "@/components/portal/PortalTopBar";

export const dynamic = "force-dynamic";

export default async function PortalResourcesPage() {
  const session = await readPortalSession();
  if (!session) redirect("/portal");

  let groups: { category: string; items: Resource[] }[] = [];
  try {
    groups = groupByCategory(await getMemberResources(db));
  } catch (err) {
    // resources (migration 0007) may not be applied yet — degrade gracefully.
    console.error("[portal/resources] load failed:", err);
  }

  return (
    <div className="min-h-full flex flex-col">
      <PortalTopBar links={[{ href: "/portal/dashboard", label: "Dashboard" }]} />

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Resource Library</h1>
          <p className="text-text-secondary text-sm mt-1">
            Guides, programs, forms, and links curated by the chamber, including members-only
            resources.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-text-secondary text-sm py-8">
            No resources yet. Check back soon, or{" "}
            <a href="/about/contact" className="font-semibold" style={{ color: "#83BCA9" }}>
              ask the chamber
            </a>
            .
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.category}>
                <h2 className="text-sm font-bold uppercase tracking-wide text-text-tertiary mb-3">
                  {g.category}
                </h2>
                <div className="space-y-3">
                  {g.items.map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-bg-secondary border border-border-secondary rounded-lg hover:border-border-primary transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text-primary">{r.title}</span>
                        {r.isMemberOnly && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "#dbeafe", color: "#1e40af" }}
                          >
                            Members only
                          </span>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                          {r.description}
                        </p>
                      )}
                      <p className="text-sm font-semibold mt-2" style={{ color: "#83BCA9" }}>
                        {r.linkLabel || "Open"} →
                      </p>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="text-center py-6 mt-4">
        <p className="text-xs text-text-tertiary">
          Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
        </p>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getPublicResources, groupByCategory, type Resource } from "@/lib/resources";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Resource Library, Medina County Businesses",
  description:
    "A curated library of tools, programs, forms, and links for Medina County, Ohio businesses, organized by topic by the Greater Medina Chamber of Commerce.",
  openGraph: {
    title: "Resource Library | Greater Medina Chamber of Commerce",
    description: "Tools, programs, forms, and links for Medina County businesses.",
  },
  alternates: { canonical: "/resources/library" },
};

export default async function ResourceLibraryPage() {
  let groups: { category: string; items: Resource[] }[] = [];
  try {
    groups = groupByCategory(await getPublicResources(db));
  } catch (err) {
    // resources (migration 0007) may not be applied yet — show the empty state.
    console.error("[resources/library] load failed:", err);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Greater Medina Chamber</p>
        <h1 className="text-display">
          <span className="block">Resource Library</span>
          <span className="block text-accent">for Medina County</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          A curated set of tools, programs, forms, and links to help Medina County
          businesses start, fund, hire, and grow.
        </p>
        <Link
          href="/resources"
          className="inline-block mt-6 text-body-sm font-bold text-cambridge hover:translate-x-1 transition-transform"
        >
          ← All resources &amp; guides
        </Link>
      </section>

      {/* Library, grouped by category */}
      {groups.length === 0 ? (
        <p className="text-body text-text-secondary mt-20 max-w-2xl">
          We&apos;re building out the library. Check back shortly, or{" "}
          <Link href="/about/contact" className="text-cambridge font-bold hover:underline">
            ask the chamber
          </Link>{" "}
          for a specific resource.
        </p>
      ) : (
        <div className="mt-20 space-y-16">
          {groups.map((g) => (
            <section key={g.category}>
              <h2 className="text-h3 mb-6">{g.category}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {g.items.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] hover:border-border-primary transition-colors"
                  >
                    <h3 className="text-body-lg font-bold text-text-primary">{r.title}</h3>
                    {r.description && (
                      <p className="text-body-sm text-text-secondary mt-2 leading-relaxed flex-1">
                        {r.description}
                      </p>
                    )}
                    <p className="mt-4 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">
                      {r.linkLabel || "Open"} →
                    </p>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDirectoryMembers, topIndustries } from "@/lib/directory";
import { DirectoryClient } from "./DirectoryClient";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Member Directory",
  description:
    "Find local businesses in Medina County. Search Greater Medina Chamber of Commerce member businesses by name, service, industry, or city.",
  openGraph: {
    title: "Member Directory | Greater Medina Chamber of Commerce",
    description:
      "Find local businesses in Medina County. Search Chamber member businesses by name, service, industry, or city.",
  },
  alternates: { canonical: "/membership/directory" },
};

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  let members: Awaited<ReturnType<typeof getDirectoryMembers>> = [];
  try {
    members = await getDirectoryMembers(db);
  } catch (err) {
    console.error("[directory] load failed:", err);
  }
  // Full count-sorted category list; the client shows the top 10 until
  // the visitor expands to all categories.
  const industries = topIndustries(members);

  return (
    <>
      <DirectoryClient members={members} industries={industries} />

      {/* SEO — server-rendered member list (hidden from users) ─
          sr-only keeps HTML in the DOM so crawlers index it
          and screen readers can still announce it, while visually
          hidden from sighted users. (aria-hidden was wrong here —
          sr-only's whole purpose is to expose content to AT, so
          marking it aria-hidden contradicted itself.) */}
      <div className="sr-only">
        <h2>All Chamber Member Businesses</h2>
        {members.map((m) => (
          <div key={m.chamberSlug}>
            <a href={`/membership/directory/${m.chamberSlug}`}>{m.name}</a>
            {m.categories.length > 0 && (
              <span>, {m.categories.join(", ")}</span>
            )}
            {m.address && <span>, {m.address}</span>}
            {m.description && <span>, {m.description}</span>}
          </div>
        ))}
      </div>

      {/* Join CTA (preserved from previous implementation) */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="max-w-2xl">
              <h2 className="text-h2">Want your business in the directory?</h2>
              <p className="text-body-lg text-text-secondary mt-f13">
                Chamber members are automatically listed with their full business
                profile, name, address, website, categories, and description.
                It&apos;s one of the most visible benefits of membership.
              </p>
              <div className="mt-f21 flex flex-wrap gap-f13">
                <Link
                  href="/membership/join"
                  className="
                    inline-flex items-center px-f21 py-f13
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                    transition-colors duration-200
                  "
                >
                  Join the Chamber <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    inline-flex items-center px-f21 py-f13
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                    transition-colors duration-200
                  "
                >
                  See All Benefits
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

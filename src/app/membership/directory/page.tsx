import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDirectoryMembers, topIndustries } from "@/lib/directory";
import { members as staticMembers } from "@/data/members";
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
  // Resilience: the DB is the only runtime dependency of this public page.
  // If it's unreachable (bad prod DATABASE_URL, enforced SSL, IP allowlist)
  // or returns nothing, fall back to the bundled static roster so the
  // directory degrades to a full, styled page instead of rendering empty.
  if (members.length === 0) {
    console.warn("[directory] DB returned no members — using static roster fallback");
    members = staticMembers;
  }
  // Full count-sorted category list; the client shows the top 10 until
  // the visitor expands to all categories.
  const industries = topIndustries(members);

  // The full A–Z member dump was removed — the searchable grid above plus
  // sitemap.ts cover browsing and crawl indexing respectively.
  return (
    <>
      <DirectoryClient members={members} industries={industries} />

      {/* Join CTA — clock-medina ghosted as the section background */}
      <section className="relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted Medina town-clock backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/clock-medina.jpg"
            alt=""
            fill
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
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
          </FadeIn>
        </div>
      </section>
    </>
  );
}

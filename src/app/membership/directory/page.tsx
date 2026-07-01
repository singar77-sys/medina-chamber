import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { getDirectoryMembers, topIndustries } from "@/lib/directory";
import { extractCity } from "@/data/members";
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

      {/* SEO — server-rendered A–Z member list, VISIBLE (not sr-only).
          Every member's detail page is already in sitemap.ts and linked
          here by name, so crawlers index the full roster via real links.
          We deliberately DON'T dump each member's full address +
          description into the DOM: that hidden-text block bloated every
          request on this force-dynamic page for no SEO gain over the
          canonical detail pages. Name + link + city + primary category is
          enough to index and is genuinely useful to browsing visitors. */}
      {members.length > 0 && (
        <section
          aria-labelledby="all-members-heading"
          className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 border-t border-border-secondary"
        >
          <header className="mb-f21">
            <p className="text-overline text-text-tertiary">All members</p>
            <h2 id="all-members-heading" className="text-h3 mt-f5">
              Every chamber business, A–Z
            </h2>
          </header>
          <ul className="columns-1 sm:columns-2 lg:columns-3 gap-f21 text-caption">
            {members.map((m) => {
              const city = extractCity(m.address);
              const primary = m.categories[0];
              return (
                <li key={m.chamberSlug} className="mb-f5 break-inside-avoid">
                  <Link
                    href={`/membership/directory/${m.chamberSlug}`}
                    className="text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:text-accent focus-visible:underline focus-visible:underline-offset-2 transition-colors duration-200"
                  >
                    <span className="font-medium">{m.name}</span>
                    {city && <span className="text-text-tertiary"> · {city}</span>}
                    {primary && <span className="text-text-tertiary"> · {primary}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

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

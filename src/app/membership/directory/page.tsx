import type { Metadata } from "next";
import Link from "next/link";
import { members, getTopIndustries, getAllCategories } from "@/data/members";
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

export default function DirectoryPage() {
  const topIndustries = getTopIndustries(10);
  const totalIndustries = getAllCategories().length;

  return (
    <>
      <DirectoryClient
        members={members}
        topIndustries={topIndustries}
        totalIndustries={totalIndustries}
      />

      {/* Network View easter egg */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-f55">
        <Link
          href="/membership/directory/network"
          className="
            inline-flex items-center gap-f8
            text-caption text-text-tertiary hover:text-accent
            focus-visible:outline-none focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-cambridge/40 focus-visible:rounded
            transition-colors duration-200
          "
        >
          Explore the network view <span aria-hidden="true">→</span>
        </Link>
      </section>

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

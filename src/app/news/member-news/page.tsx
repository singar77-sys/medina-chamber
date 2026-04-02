import type { Metadata } from "next";
import Link from "next/link";
import { growthZone } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Member News",
  description:
    "News and announcements from Greater Medina Chamber of Commerce member businesses. Job postings, events, promotions, and milestones from the Medina County business community.",
  openGraph: {
    title: "Member News — Greater Medina Chamber of Commerce",
    description:
      "News and announcements from Medina County businesses.",
  },
};

export default function MemberNewsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Member News</p>
        <h1 className="text-display">
          What&apos;s Happening
          <br />
          <span className="text-accent">in Medina Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Member businesses share their news directly through the Chamber —
          new hires, promotions, job openings, events, and milestones. This is
          the pulse of Medina County&apos;s business community.
        </p>

        <div className="mt-10">
          <a
            href={growthZone.memberNews}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center px-6 py-3
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Read All Member News →
          </a>
        </div>
      </section>

      {/* What You'll Find */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-8">What Members Post</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "Job Openings",
              description:
                "Member businesses post open positions. Hiring local is a Chamber priority.",
            },
            {
              title: "Events & Promotions",
              description:
                "Sales, grand openings, special events, and seasonal promotions from member businesses.",
            },
            {
              title: "Awards & Milestones",
              description:
                "Anniversaries, expansions, certifications, and achievements worth celebrating.",
            },
            {
              title: "Community Involvement",
              description:
                "Sponsorships, charity drives, volunteer efforts, and ways members give back.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="
                p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
              "
            >
              <h3 className="text-h4 mb-3">{item.title}</h3>
              <p className="text-body-sm text-text-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want to post your news?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members can submit news directly through the member portal.
            Your announcement reaches the entire Chamber network — other
            business owners, community leaders, and potential customers.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Join the Chamber →
            </Link>
            <Link
              href="/news"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Chamber News
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

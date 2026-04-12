import type { Metadata } from "next";
import Link from "next/link";
import { jobs, formatJobDate, totalJobsCount } from "@/data/jobs";

export const metadata: Metadata = {
  title: "Job Board",
  description:
    "Job openings posted by Greater Medina Chamber of Commerce member businesses. Find local employment opportunities in Medina County, Ohio.",
  openGraph: {
    title: "Job Board — Greater Medina Chamber of Commerce",
    description:
      "Local job openings posted by Medina County Chamber member businesses.",
  },
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Member Resources</p>
        <h1 className="text-display">
          Local
          <br />
          <span className="text-accent">Job Board</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Job openings posted by Greater Medina Chamber member businesses.
          These are real positions from employers in Medina County — hiring
          locally, through the Chamber network.
        </p>
        {totalJobsCount > 0 && (
          <p className="text-body-sm text-text-tertiary mt-3">
            {totalJobsCount} open position{totalJobsCount !== 1 ? "s" : ""} currently listed
          </p>
        )}
      </section>

      {/* Job listings */}
      <section className="mt-16">
        {jobs.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-h3 text-text-tertiary">No open positions right now</p>
            <p className="text-body text-text-tertiary mt-2">
              Check back soon — member businesses post new openings regularly.
            </p>
            <p className="text-body-sm text-text-tertiary mt-6">
              Member businesses can post jobs through the{" "}
              <a
                href="https://greatermedinachamberofcommerce.growthzoneapp.com"
                className="text-cambridge hover:text-cambridge/80 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Member Portal
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <a
                key={`${job.slug}-${job.jobId}`}
                href={job.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4
                  p-6 bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-border-primary transition-colors
                "
              >
                {/* Left: job info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-caption font-bold text-cambridge uppercase tracking-wider"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-h4 group-hover:text-cambridge transition-colors">
                    {job.title}
                  </h2>
                  {job.companyName && (
                    <p className="text-body-sm text-text-secondary mt-0.5">
                      {job.companyName}
                      {job.location ? ` · ${job.location}` : ""}
                    </p>
                  )}
                  {(job.subtitle || job.body) && (
                    <p className="text-body-sm text-text-tertiary mt-3 leading-relaxed line-clamp-2">
                      {job.subtitle || job.body.substring(0, 200)}
                    </p>
                  )}
                </div>

                {/* Right: date + arrow */}
                <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
                  <span className="text-caption text-text-tertiary">
                    {formatJobDate(job)}
                  </span>
                  <span className="text-cambridge font-bold text-body-sm group-hover:translate-x-0.5 transition-transform">
                    View →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Post a job CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2 text-white">Hiring? Post to the board.</h2>
            <p className="text-body-lg text-white/70 mt-4">
              Chamber members can post job openings directly through the Member
              Portal. Reach the Medina County business community and connect
              with local talent.
            </p>
          </div>
          <div className="space-y-4">
            <a
              href="https://greatermedinachamberofcommerce.growthzoneapp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="
                block w-full text-center py-3 px-6
                bg-cambridge hover:bg-cambridge/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Post a Job (Member Portal) →
            </a>
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
                border border-white/30 hover:border-white/60
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Not a member? Join the Chamber
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

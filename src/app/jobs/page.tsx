import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { jobs, formatJobDate, totalJobsCount } from "@/data/jobs";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Job Board",
  description:
    "Job openings posted by Greater Medina Chamber of Commerce member businesses. Find local employment opportunities in Medina County, Ohio.",
  openGraph: {
    title: "Job Board | Greater Medina Chamber of Commerce",
    description:
      "Local job openings posted by Medina County Chamber member businesses.",
  },
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  return (
    <>
      
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted historic Medina Square storefronts backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-job-board-hero.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Member Resources</p>
            <h1 className="text-display">
              <span className="block">Local</span>
              <span className="block text-accent">Job Board</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Job openings posted by Greater Medina Chamber member businesses.
              These are real positions from employers in Medina County, hiring
              locally, through the Chamber network.
            </p>
            {totalJobsCount > 0 && (
              /* mt-f8 (8px) — count sub-label tuck */
              <p className="text-body-sm text-text-tertiary mt-f8">
                {totalJobsCount} open position{totalJobsCount !== 1 ? "s" : ""} currently listed
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Job listings */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          {jobs.length === 0 ? (
            /* Empty state — py-f89 centering, mt-f8/f21 gaps */
            <div className="py-f89 text-center">
              <p className="text-h3 text-text-tertiary">No open positions right now</p>
              <p className="text-body text-text-tertiary mt-f8">
                Check back soon, member businesses post new openings regularly.
              </p>
              <p className="text-body-sm text-text-tertiary mt-f21">
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
            /* space-y-f21 (21px) — between job cards */
            <div className="space-y-f21">
              {jobs.map((job) => (
                <Link
                  key={`${job.slug}-${job.jobId}`}
                  href={`/jobs/${job.slug}`}
                  className="
                    group flex flex-col sm:flex-row sm:items-start sm:justify-between gap-f21
                    p-f21 bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-border-primary transition-colors
                  "
                >
                  {/* Left: job info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-f8 mb-f3">
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
                      /* mt-f3 (3px) — title→company micro-gap */
                      <p className="text-body-sm text-text-secondary mt-f3">
                        {job.companyName}
                        {job.location ? ` · ${job.location}` : ""}
                      </p>
                    )}
                    {(job.subtitle || job.body) && (
                      /* mt-f13 (13px) — company→excerpt gap */
                      <p className="text-body-sm text-text-tertiary mt-f13 leading-relaxed line-clamp-2">
                        {job.subtitle || job.body.substring(0, 200)}
                      </p>
                    )}
                  </div>

                  {/* Right: date + arrow — gap-f13 sm:gap-f5 */}
                  <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-f13 sm:gap-f5">
                    <span className="text-caption text-text-tertiary">
                      {formatJobDate(job)}
                    </span>
                    <span className="text-cambridge font-bold text-body-sm group-hover:translate-x-0.5 transition-transform">
                      View →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </FadeIn>
      </section>

      {/* Post a job CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Hiring? Post to the board.</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Chamber members can post job openings directly through the
                  Member Portal. Reach the Medina County business community and
                  connect with local talent.
                </p>
              </div>
              <div className="space-y-f21">
                <a
                  href="https://greatermedinachamberofcommerce.growthzoneapp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
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
                    block w-full text-center py-f13 px-f21
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Not a member? Join the Chamber
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

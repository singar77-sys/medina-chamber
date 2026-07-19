import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, ButtonA } from "@/components/ui/Button";
import { jobs, getJobBySlug, formatJobDate } from "@/data/jobs";
import { members } from "@/data/members";

import { safeJsonLd } from "@/lib/json-ld";
// ── Static generation ─────────────────────────────────────────────
export function generateStaticParams() {
  return jobs.map((j) => ({ slug: j.slug }));
}

// ── Per-page metadata ─────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return { title: "Job Not Found" };

  const description = `${job.title} at ${job.companyName} in Medina County, Ohio. ${job.body.substring(0, 120).replace(/\n/g, " ")}`;

  return {
    title: `${job.title}, ${job.companyName}`,
    description,
    openGraph: {
      title: `${job.title} at ${job.companyName} | Medina Chamber Jobs`,
      description,
    },
    alternates: { canonical: `/jobs/${slug}` },
  };
}

// ── Page component ────────────────────────────────────────────────
export default async function JobDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const dateDisplay = formatJobDate(job);

  // Try to link to the member's directory profile
  const memberRecord = job.companyName
    ? members.find((m) => m.name.toLowerCase() === job.companyName.toLowerCase())
    : undefined;

  // Parse body into paragraphs
  const bodyParagraphs = job.body
    ? job.body.split("\n").filter(Boolean)
    : [];

  // Map tags to schema.org employmentType enum values (future-proof for when
  // GrowthZone job tags are populated).
  const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
    "full-time": "FULL_TIME",
    "full time": "FULL_TIME",
    "part-time": "PART_TIME",
    "part time": "PART_TIME",
    "contract": "CONTRACTOR",
    "contractor": "CONTRACTOR",
    "temporary": "TEMPORARY",
    "temp": "TEMPORARY",
    "intern": "INTERN",
    "internship": "INTERN",
    "volunteer": "VOLUNTEER",
    "per diem": "PER_DIEM",
  };
  const employmentTypes = [
    ...new Set(
      job.tags
        .map((t) => EMPLOYMENT_TYPE_MAP[t.toLowerCase()])
        .filter(Boolean)
    ),
  ];

  // validThrough: Google recommends a closing date. Default to 90 days after
  // posting since GrowthZone doesn't expose an expiration date.
  const validThrough = (() => {
    if (!job.dateISO) return undefined;
    const d = new Date(job.dateISO);
    d.setDate(d.getDate() + 90);
    return d.toISOString().substring(0, 10);
  })();

  // JSON-LD JobPosting schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.body || job.subtitle || `${job.title} position at ${job.companyName} in Medina County, Ohio.`,
    datePosted: job.dateISO,
    ...(validThrough && { validThrough }),
    ...(employmentTypes.length > 0 && { employmentType: employmentTypes }),
    ...(job.jobId && {
      identifier: {
        "@type": "PropertyValue",
        name: job.companyName,
        value: job.jobId,
      },
    }),
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
      // sameAs is the correct schema.org field for the company's own website.
      ...(memberRecord?.website && { sameAs: memberRecord.website }),
      ...(memberRecord?.logoUrl && { logo: memberRecord.logoUrl }),
    },
    jobLocation: {
      "@type": "Place",
      ...(job.location && { name: job.location }),
      address: {
        "@type": "PostalAddress",
        addressLocality: "Medina",
        addressRegion: "OH",
        postalCode: "44256",
        addressCountry: "US",
      },
    },
    url: `https://medinachamber.com/jobs/${slug}`,
    ...(job.applyUrl && { directApply: true }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
      { "@type": "ListItem", position: 2, name: "Job Board", item: "https://medinachamber.com/jobs" },
      { "@type": "ListItem", position: 3, name: job.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/jobs" className="hover:text-text-primary transition-colors">
            Job Board
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{job.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12 lg:gap-16">
          {/* Main column */}
          <div>
            <p className="text-overline text-cambridge mb-f13">
              Posted {dateDisplay}
            </p>

            <h1 className="text-display leading-tight">{job.title}</h1>

            <p className="text-h4 text-text-secondary mt-f8">
              {job.companyName}
            </p>

            {job.location && (
              <p className="text-body-sm text-text-tertiary mt-1">
                {job.location}
              </p>
            )}

            {/* Body */}
            {bodyParagraphs.length > 0 && (
              <div className="mt-10 space-y-3 max-w-3xl">
                {bodyParagraphs.map((p, i) => (
                  <p
                    key={i}
                    className="text-body text-text-primary leading-relaxed"
                  >
                    {p}
                  </p>
                ))}
              </div>
            )}

          </div>

          {/* Sidebar */}
          <aside className="space-y-f21">
            {/* Company card */}
            <div className="sticky top-8 space-y-f13">
              <div className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                <p className="text-caption text-cambridge mb-2 font-bold uppercase tracking-wider">
                  Posted by
                </p>
                <p className="text-body font-bold text-text-primary leading-snug">
                  {job.companyName}
                </p>
                <p className="text-caption text-text-tertiary mt-1">{dateDisplay}</p>

                {job.applyUrl && (
                  <ButtonA
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="primary"
                    size="sm"
                    className="mt-f13 w-full justify-center"
                  >
                    Apply Now →
                  </ButtonA>
                )}

                {memberRecord && (
                  <ButtonLink
                    href={`/membership/directory/${memberRecord.chamberSlug}`}
                    variant="secondary"
                    size="sm"
                    className="mt-f8 w-full justify-center"
                  >
                    View Company Profile →
                  </ButtonLink>
                )}
              </div>

              {/* Back link */}
              <ButtonLink
                href="/jobs"
                variant="ghost"
                size="md"
                className="w-full justify-center"
              >
                ← All Jobs
              </ButtonLink>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

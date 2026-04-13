import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { jobs, getJobBySlug, formatJobDate } from "@/data/jobs";
import { members } from "@/data/members";

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
    title: `${job.title} — ${job.companyName}`,
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
    ? job.body
        .replace(/&rsquo;/g, "\u2019")
        .replace(/&mdash;/g, "\u2014")
        .replace(/&bull;/g, "\u2022")
        .replace(/&amp;/g, "&")
        .split("\n")
        .filter(Boolean)
    : [];

  // JSON-LD JobPosting schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.body.substring(0, 5000),
    datePosted: job.dateISO,
    hiringOrganization: {
      "@type": "Organization",
      name: job.companyName,
      ...(memberRecord?.website && { url: memberRecord.website }),
      ...(memberRecord?.logoUrl && { logo: memberRecord.logoUrl }),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Medina",
        addressRegion: "OH",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/jobs" className="hover:text-text-primary transition-colors">
            Job Board
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{job.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12 lg:gap-16">
          {/* ── Main column ── */}
          <div>
            <p className="text-overline text-cambridge mb-4">
              Posted {dateDisplay}
            </p>

            <h1 className="text-display leading-tight">{job.title}</h1>

            <p className="text-h4 text-text-secondary mt-3">
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

            {/* Source link */}
            <div className="mt-12 pt-8 border-t border-border-secondary">
              <a
                href={job.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-body-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                View original post on GrowthZone ↗
              </a>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-6">
            {/* Company card */}
            <div className="sticky top-8 space-y-4">
              <div className="p-6 bg-oxford text-white rounded-[var(--radius-lg)]">
                <p className="text-caption text-cambridge mb-2 font-bold uppercase tracking-wider">
                  Posted by
                </p>
                <p className="text-body font-semibold leading-snug">
                  {job.companyName}
                </p>
                <p className="text-caption text-white/60 mt-1">{dateDisplay}</p>

                {job.applyUrl && (
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      block mt-5 w-full text-center py-2.5 px-4
                      bg-accent hover:bg-accent-hover
                      text-white font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    Apply Now →
                  </a>
                )}

                {memberRecord && (
                  <Link
                    href={`/membership/directory/${memberRecord.chamberSlug}`}
                    className="
                      block mt-3 w-full text-center py-2.5 px-4
                      bg-cambridge/20 hover:bg-cambridge/30
                      text-cambridge font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    View Company Profile →
                  </Link>
                )}
              </div>

              {/* Back link */}
              <Link
                href="/jobs"
                className="
                  flex items-center justify-center gap-2 w-full py-3 px-6
                  border border-border-secondary hover:border-border-primary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                ← All Jobs
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

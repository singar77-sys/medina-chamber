import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { members, getMemberBySlug, extractCity, getInitials, isVisibilityPlus } from "@/data/members";

import { safeJsonLd } from "@/lib/json-ld";
// ── Static generation ──────────────────────────────────────────
export function generateStaticParams() {
  return members.map((m) => ({ slug: m.chamberSlug }));
}

// ── Per-page metadata ──────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const member = getMemberBySlug(slug);
  if (!member) return { title: "Member Not Found" };

  const city = extractCity(member.address) || "Medina";
  const descBase = member.description
    ? member.description.substring(0, 140)
    : `${member.name} is a member of the Greater Medina Chamber of Commerce located in ${city}, Ohio.`;

  return {
    title: member.name,
    description: descBase,
    openGraph: {
      title: `${member.name} | Medina Chamber Member`,
      description: descBase,
      ...(member.logoUrl && { images: [{ url: member.logoUrl }] }),
    },
    alternates: {
      canonical: `/membership/directory/${slug}`,
    },
  };
}

// ── Page component ─────────────────────────────────────────────
export default async function MemberPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const member = getMemberBySlug(slug);
  if (!member) notFound();

  const city = extractCity(member.address);
  const initials = getInitials(member.name);
  const visPlus = isVisibilityPlus(member);

  // JSON-LD LocalBusiness schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: member.name,
    url: member.website || member.gzUrl,
    telephone: member.phone || undefined,
    address: member.address
      ? {
          "@type": "PostalAddress",
          streetAddress: member.address.split(",")[0]?.trim(),
          addressLocality: city,
          addressRegion: "OH",
          addressCountry: "US",
        }
      : undefined,
    description: member.description || undefined,
    image: member.logoUrl || undefined,
    memberOf: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
  };

  const hasSocial = Object.keys(member.social).length > 0;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
      { "@type": "ListItem", position: 2, name: "Member Directory", item: "https://medinachamber.com/membership/directory" },
      { "@type": "ListItem", position: 3, name: member.name },
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

      <div className="mx-auto max-w-5xl px-6 lg:px-8 py-12 lg:py-20">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/membership/directory" className="hover:text-text-primary transition-colors">
            Member Directory
          </Link>
          <span>/</span>
          <span className="text-text-secondary truncate">{member.name}</span>
        </nav>

        {/* ── Header card ── */}
        <div className="
          flex flex-col sm:flex-row gap-8
          p-8 lg:p-10
          bg-bg-secondary border border-border-secondary
          rounded-[var(--radius-lg)]
        ">
          {/* Logo */}
          <div className="
            relative w-28 h-28 shrink-0
            bg-bg-primary border border-border-secondary
            rounded-[var(--radius-md)] overflow-hidden
            flex items-center justify-center
            self-start
          ">
            {member.logoUrl ? (
              <Image
                src={member.logoUrl}
                alt={`${member.name} logo — Greater Medina Chamber of Commerce member business in Medina, Ohio`}
                fill
                className="object-contain p-3"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-bold text-text-tertiary">
                {initials}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Visibility Plus badge */}
            {visPlus && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 bg-amber-50 border border-amber-200 rounded-full">
                <svg className="w-3 h-3 text-amber-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                </svg>
                <span className="text-[11px] font-bold tracking-wide text-amber-700 uppercase">Visibility Plus Member</span>
              </div>
            )}

            {/* Categories */}
            {member.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {member.categories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/membership/directory?category=${encodeURIComponent(cat)}`}
                    className="
                      inline-block px-3 py-1
                      bg-surface-cambridge text-emerald
                      [[data-theme=dark]_&]:text-cambridge
                      text-caption font-bold
                      rounded-full
                      hover:bg-cambridge/20 transition-colors
                    "
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}

            <h1 className="text-h1 leading-tight">{member.name}</h1>

            {/* Contact details */}
            <div className="mt-5 flex flex-col gap-2.5">
              {member.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(member.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 text-body-sm text-text-secondary hover:text-accent transition-colors group"
                >
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-text-tertiary group-hover:text-accent" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                  </svg>
                  {member.address}
                </a>
              )}

              {member.phone && (
                <a
                  href={`tel:${member.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-accent transition-colors group"
                >
                  <svg className="w-4 h-4 shrink-0 text-text-tertiary group-hover:text-accent" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58L3.654 1.328z"/>
                  </svg>
                  {member.phone}
                </a>
              )}

              {member.website && (
                <a
                  href={member.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-body-sm text-text-secondary hover:text-accent transition-colors group"
                >
                  <svg className="w-4 h-4 shrink-0 text-text-tertiary group-hover:text-accent" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.96 6.96 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zm4.187 0h1.326c.296.78.48 1.62.513 2.5h-2.153c.076-.88.14-1.718.314-2.5m2.626 3.5H13.5c-.032.877-.138 1.718-.312 2.5h1.326c.296-.78.48-1.62.513-2.5zM11.99 8.5H8.5V11h3.153a12.5 12.5 0 0 0 .337-2.5m-3.49 3.5V14.5h-1.5v-2.5zm-2.5 0H2.99a12.5 12.5 0 0 0 .337 2.5H5.5V12zm-3.49 0h1.326c-.174.782-.28 1.623-.312 2.5H1.674a6.96 6.96 0 0 0 .513-2.5z"/>
                  </svg>
                  <span className="truncate">{member.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              {member.website && (
                <a
                  href={member.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center gap-2 px-5 py-2.5
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Visit Website
                </a>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone.replace(/\D/g, "")}`}
                  className="
                    inline-flex items-center gap-2 px-5 py-2.5
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Call {member.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── About ── */}
        {member.description && (
          <section className="mt-10">
            <h2 className="text-h3 mb-4">About {member.name}</h2>
            <p className="text-body text-text-secondary leading-relaxed max-w-3xl">
              {member.description}
            </p>
          </section>
        )}

        {/* ── Social Links ── */}
        {hasSocial && (
          <section className="mt-10">
            <h2 className="text-overline text-cambridge mb-4">Connect Online</h2>
            <div className="flex flex-wrap gap-3">
              {member.social.facebook && (
                <SocialLink href={member.social.facebook} label="Facebook" icon="facebook" />
              )}
              {member.social.linkedin && (
                <SocialLink href={member.social.linkedin} label="LinkedIn" icon="linkedin" />
              )}
              {member.social.instagram && (
                <SocialLink href={member.social.instagram} label="Instagram" icon="instagram" />
              )}
              {member.social.twitter && (
                <SocialLink href={member.social.twitter} label="X / Twitter" icon="twitter" />
              )}
              {member.social.youtube && (
                <SocialLink href={member.social.youtube} label="YouTube" icon="youtube" />
              )}
            </div>
          </section>
        )}

        {/* ── Chamber badge ── */}
        <div className="mt-14 pt-8 border-t border-border-secondary flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-caption text-text-tertiary">
              Proud member of the{" "}
              <Link href="/" className="text-cambridge hover:underline">
                Greater Medina Chamber of Commerce
              </Link>
            </p>
          </div>
          <Link
            href="/membership/directory"
            className="text-caption text-text-tertiary hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            ← Back to Directory
          </Link>
        </div>

      </div>
    </>
  );
}

// ── Social link helper ─────────────────────────────────────────
function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    facebook: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    linkedin: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    instagram: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
    twitter: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="
        inline-flex items-center gap-2 px-4 py-2
        border border-border-primary hover:border-text-tertiary
        text-text-secondary hover:text-text-primary
        text-caption font-bold
        rounded-[var(--radius-md)]
        transition-colors
      "
    >
      {icons[icon]}
      {label}
    </a>
  );
}

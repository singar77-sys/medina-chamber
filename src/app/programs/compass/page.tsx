import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { safeJsonLd } from "@/lib/json-ld";
import { getMergedStaticPhotos } from "@/lib/static-media";
import { EventGallery } from "@/components/events/EventGallery";

export const metadata: Metadata = {
  title: "Compass Professional Development Program",
  description:
    "The Compass Program is a professional leadership development initiative by the Greater Medina Chamber of Commerce, in partnership with the Center for Immersive Leadership. Five interactive sessions covering self-awareness, communication, well-being, and community citizenship.",
  openGraph: {
    title: "Compass Professional Development Program | Greater Medina Chamber of Commerce",
    description:
      "Five-session leadership development program for professionals at every career stage. Presented by the Greater Medina Chamber and the Center for Immersive Leadership.",
  },
  alternates: { canonical: "/programs/compass" },
};

const sessions = [
  {
    number: 1,
    title: "Leadership Purpose, Values & Storytelling",
    duration: "9:00 AM – 2:00 PM",
    includes: "Lunch included",
    topics: ["Personal purpose", "Core values", "Leadership storytelling", "SOAR analysis"],
  },
  {
    number: 2,
    title: "Enneagram & Leadership Motivation",
    duration: "9:00 AM – 12:00 PM",
    includes: "Snacks included",
    topics: ["Enneagram personality framework", "Leadership motivation", "Team dynamics", "Self-awareness"],
  },
  {
    number: 3,
    title: "Mindfulness & Effective Communication",
    duration: "9:00 AM – 12:00 PM",
    includes: "Snacks included",
    topics: ["Mindful leadership", "Feedback frameworks", "Confident communication", "Leadership presence"],
  },
  {
    number: 4,
    title: "Leadership & Well-Being",
    duration: "9:00 AM – 12:00 PM",
    includes: "Snacks included",
    topics: ["Leader well-being", "Sustainable performance", "Ethics in leadership", "Team management"],
  },
  {
    number: 5,
    title: "Corporate & Community Citizenship",
    duration: "3:00 PM – 7:00 PM",
    includes: "Hors d'oeuvres reception & graduation",
    topics: ["Board service", "Community involvement", "Corporate responsibility", "Graduation ceremony"],
  },
];

const audience = [
  {
    title: "New Professionals",
    description: "Building a leadership foundation early in your career.",
  },
  {
    title: "Mid-Level Staff",
    description: "Ready for the next step and seeking tools to get there.",
  },
  {
    title: "Experienced Contributors",
    description: "Refining your approach and expanding your impact.",
  },
  {
    title: "Employer-Sponsored",
    description: "Team members your organization wants to invest in. Compass is a retention and development tool.",
  },
];

const overview = [
  { label: "Format", value: "5 interactive sessions\nFebruary – May" },
  { label: "Location", value: "Chamber Office\n139 N. Court Street, Medina" },
  { label: "Investment", value: "$995 per participant" },
];

export default async function CompassPage() {
  const classPhotos = await getMergedStaticPhotos([
    {
      folder: "programs/compass/class-day-2",
      alt: "Compass Professional Development Program participants during a session at the Greater Medina Chamber of Commerce in Medina, Ohio",
      limit: 12,
    },
    {
      folder: "programs/compass/class-day-3",
      alt: "Compass Professional Development Program participants at a workshop session in Medina, Ohio",
    },
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Compass Professional Development Program",
    description:
      "A five-session professional leadership development program covering self-awareness, communication, well-being, and community citizenship. Presented by the Greater Medina Chamber of Commerce and the Center for Immersive Leadership.",
    provider: [
      {
        "@type": "Organization",
        name: "Greater Medina Chamber of Commerce",
        url: "https://medinachamber.com",
      },
      { "@type": "Organization", name: "Center for Immersive Leadership" },
    ],
    offers: {
      "@type": "Offer",
      price: "995",
      priceCurrency: "USD",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "onsite",
      location: {
        "@type": "Place",
        name: "Greater Medina Chamber of Commerce",
        address: {
          "@type": "PostalAddress",
          streetAddress: "139 N. Court Street",
          addressLocality: "Medina",
          addressRegion: "OH",
          postalCode: "44256",
          addressCountry: "US",
        },
      },
      startDate: "2026-02-01",
      endDate: "2026-05-31",
    },
    url: "https://medinachamber.com/programs/compass",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Compass leadership backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-compass-hero.webp"
            alt=""
            fill
            priority
            className="object-cover object-top opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">
            Leadership Development
          </p>
          <h1 className="text-display">
            <span className="block">Compass</span>
            <span className="block text-accent">Program</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            A five-session professional development program designed to help
            Medina County professionals grow in self-awareness, leadership
            skills, and community engagement at every stage of their career.
          </p>
          <p className="text-body-sm text-text-tertiary mt-f13">
            Presented by the{" "}
            <span className="text-text-secondary font-bold">
              Greater Medina Chamber of Commerce
            </span>{" "}
            in partnership with the{" "}
            <span className="text-text-secondary font-bold">
              Center for Immersive Leadership
            </span>
            .
          </p>

          <div className="mt-f34 flex flex-wrap gap-f13">
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-8 py-4
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Get Notified for Next Cohort →
            </Link>
          </div>
          </div>
        </div>
      </section>

      {/* Program overview */}
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
        <FadeIn>
          <div className="grid lg:grid-cols-3 gap-f21">
            {overview.map((item) => (
              <div
                key={item.label}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                  {item.label}
                </p>
                <p className="text-body font-bold text-text-primary whitespace-pre-line">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* The five sessions */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted reservoir-trail backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-reservoir-trail.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21">
              <p className="text-overline text-cambridge mb-f8">The Curriculum</p>
              <h2 className="text-h2">Five Sessions, One Cohort</h2>
            </div>
            <div className="space-y-f13">
              {sessions.map((s) => (
                <div
                  key={s.number}
                  className="grid sm:grid-cols-[64px_1fr_1fr] gap-f13 p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-oxford/10 [[data-theme=dark]_&]:bg-cambridge/15 text-oxford [[data-theme=dark]_&]:text-cambridge font-bold text-h4 shrink-0">
                    {s.number}
                  </div>
                  <div>
                    <h3 className="text-h4 leading-snug">{s.title}</h3>
                    <p className="text-caption text-cambridge font-bold mt-f3">
                      {s.duration}
                    </p>
                    <p className="text-caption text-text-tertiary mt-f3">
                      {s.includes}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 content-start">
                    {s.topics.map((t) => (
                      <span
                        key={t}
                        className="px-2.5 py-1 text-caption bg-bg-secondary border border-border-secondary rounded-full text-text-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Session photos */}
      {classPhotos.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
          <FadeIn>
            <p className="text-overline text-cambridge mb-f8">Inside a Session</p>
            <h2 className="text-h2 mb-f21">See Compass in Action</h2>
            <EventGallery photos={classPhotos} title="" />
          </FadeIn>
        </section>
      )}

      {/* Who should apply */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="mb-f21">
            <p className="text-overline text-cambridge mb-f8">Who It&apos;s For</p>
            <h2 className="text-h2">Who Should Apply</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-f21">
            {audience.map((a) => (
              <div
                key={a.title}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <h3 className="text-h4 mb-f8">{a.title}</h3>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {a.description}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted community backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/sneak-peeks/medina-chamber-community-005.webp"
            alt=""
            fill
            className="object-cover object-top opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Apply</p>
                <h2 className="text-h2">Ready to invest in your leadership?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Compass runs annually. Each cohort is limited in size to keep
                  the experience intentional and the connections real. Contact
                  the chamber to learn about the next cohort.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/about/contact"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Contact the Chamber →
                </Link>
                <a
                  href="tel:+13307238773"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  (330) 723-8773
                </a>
              </div>
            </div>
          </div>

          <div className="mt-f34">
            <Link
              href="/programs"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Programs
            </Link>
          </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

/**
 * Chamber Ambassadors — φ spatial system applied throughout.
 *
 * HERO    pt-f144 pb-f89
 * FEATURE py-f89 lg:py-f144 — What Ambassadors Do (4 role cards, open white)
 * BAND    py-f55 lg:py-f89  — Ambassador grid (12 cards, bg-secondary)
 * CLOSER  py-f55 lg:py-f89  — Become an Ambassador CTA card
 */

export const metadata: Metadata = {
  title: "Chamber Ambassadors",
  description:
    "Meet the 12 volunteer Chamber Ambassadors of the Greater Medina Chamber of Commerce. Member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber across Medina County, Ohio.",
  openGraph: {
    title: "Chamber Ambassadors | Greater Medina Chamber of Commerce",
    description:
      "Volunteer member representatives who welcome new businesses and represent the chamber across Medina County.",
  },
  alternates: { canonical: "/about/ambassadors" },
};

const ambassadors = [
  {
    name: "Kari Deeks",
    title: "Treasury Management Officer",
    company: "First Federal of Lakewood",
    email: "kdeeks@ffl.net",
    website: "https://www.ffl.bank/",
    photo:
      "/images/people/ambassadors/kari-deeks-first-federal-medina-chamber-ambassador.jpg",
  },
  {
    name: "Brittney Esser",
    title: "Escrow Processor",
    company: "Title Select",
    email: "brittney@titleselect.net",
    website: "https://www.titleselect.net",
    photo:
      "/images/people/ambassadors/brittney-esser-title-select-medina-chamber-ambassador.jpg",
  },
  {
    name: "Tania Grant",
    title: "Owner",
    company: "TAG Studio",
    email: "taniagrantstudio@gmail.com",
    website: "https://www.tagvoiceover.com/",
    photo:
      "/images/people/ambassadors/tania-grant-tag-studio-medina-chamber-ambassador.jpg",
  },
  {
    name: "Don Hicks",
    title: "Area Vice President, Midwest Region",
    company: "Vensure",
    email: "don.hicks@vensure.com",
    website: "https://www.vensure.com/",
    photo:
      "/images/people/ambassadors/don-hicks-vensure-medina-chamber-ambassador.jpg",
  },
  {
    name: "Laurin Jeffers",
    title: "Events and Community Manager",
    company: "Foundry Social / High Voltage Karting / MAD Brewing",
    email: "laurinj@highvoltagekarting.com",
    website: "https://thefoundrysocial.com/",
    photo:
      "/images/people/ambassadors/laurin-jeffers-foundry-social-medina-chamber-ambassador.jpg",
  },
  {
    name: "Danielle Litton",
    title: "MRO Midwest Sales Manager",
    company: "National Process Systems",
    email: "Danielle.Litton@National-Process.com",
    website: "https://national-process.com/",
    photo:
      "/images/people/ambassadors/danielle-litton-national-process-systems-medina-chamber-ambassador.jpg",
  },
  {
    name: "Claus Meyer",
    title: "Certified Financial Planner",
    company: "Raymond James",
    email: "claus.meyer@raymondjames.com",
    website: "https://www.raymondjames.com/clausmeyer",
    photo:
      "/images/people/ambassadors/claus-meyer-raymond-james-medina-chamber-ambassador.jpg",
  },
  {
    name: "Tom Muntean",
    title: "Owner",
    company: "Thomas Muntean Agency / American Family Insurance",
    email: "TMUNTEAN@amfam.com",
    website:
      "https://www.amfam.com/agents/ohio/medina/thomas-muntean",
    photo:
      "/images/people/ambassadors/tom-muntean-american-family-insurance-medina-chamber-ambassador.jpg",
  },
  {
    name: "Cindy Phillips",
    title: "Vice President, Wealth Advisor",
    company: "Huntington Bank",
    email: "cindy.k.phillips@huntington.com",
    website: "https://www.huntington.com/",
    photo:
      "/images/people/ambassadors/cindy-phillips-huntington-bank-medina-chamber-ambassador.jpg",
  },
  {
    name: "Sam Pietrangelo",
    title: "Community Marketing Manager",
    company: "Armstrong",
    email: "spietrangelo@agoc.com",
    website: "https://armstrongonewire.com",
    photo:
      "/images/people/ambassadors/sam-pietrangelo-armstrong-medina-chamber-ambassador.jpg",
  },
  {
    name: "Tori Toth",
    title: "Walk Manager",
    company: "Alzheimer's Association",
    email: "tjtoth@alz.org",
    website: "https://www.alz.org",
    photo:
      "/images/people/ambassadors/tori-toth-alzheimers-association-medina-chamber-ambassador.jpg",
  },
  {
    name: "Kimberly Valco",
    title: "Community Relations",
    company: "Western Reserve Masonic Community",
    email: "kvalco@ohiomasonichome.org",
    website: "https://wrmcoh.org",
    photo:
      "/images/people/ambassadors/kimberly-valco-western-reserve-masonic-community-medina-chamber-ambassador.jpg",
  },
];

const roles = [
  {
    title: "Welcome New Members",
    description:
      "Ambassadors personally greet businesses when they join the chamber. A handshake and a face that says \"you made a good call.\"",
  },
  {
    title: "Ribbon Cuttings",
    description:
      "When a member opens a new location or celebrates a milestone, ambassadors show up with scissors and enthusiasm.",
  },
  {
    title: "Event Representation",
    description:
      "Ambassadors attend chamber events, mixers, and community functions as the friendly face of the organization.",
  },
  {
    title: "Member Retention",
    description:
      "They check in with members throughout the year to make sure businesses are getting real value from their membership.",
  },
];

export default function AmbassadorsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Chamber Ambassadors | Greater Medina Chamber of Commerce",
    description:
      "Meet the volunteer Chamber Ambassadors of the Greater Medina Chamber of Commerce. Member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber throughout Medina County.",
    url: "https://medinachamber.com/about/ambassadors",
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      member: ambassadors.map((a) => ({
        "@type": "Person",
        name: a.name,
        jobTitle: a.title,
        email: a.email,
        image: `https://medinachamber.com${a.photo}`,
        worksFor: {
          "@type": "Organization",
          name: a.company,
          ...(a.website ? { url: a.website } : {}),
        },
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      {/* pt-f144 pb-f89 (144/89 = φ) — HERO tier */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          {/* mb-f8 (8px) — overline→heading */}
          <p className="text-overline text-cambridge mb-f8">Volunteers</p>
          <h1 className="text-display">
            Chamber
            <br />
            <span className="text-accent">Ambassadors</span>
          </h1>
          {/* mt-f13 (13px) — heading→body */}
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Ambassadors are volunteer chamber members who serve as the friendly
            face of the Greater Medina Chamber of Commerce. They welcome new
            businesses, cut ribbons, and make sure every member feels at home
            in the Medina County business community.
          </p>
        </div>
      </section>

      {/* ─── FEATURE — What Ambassadors Do ────────────────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          {/* gap-f34/f55 — 2-col layout gap */}
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55">
            <div>
              {/* mb-f8 — overline→heading */}
              <p className="text-overline text-cambridge mb-f8">The Role</p>
              <h2 className="text-h2">What Ambassadors Do</h2>
              {/* mt-f13 — heading→body */}
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                Every chamber needs the people who show up. Ambassadors are the
                ones in the room when a new restaurant cuts its ribbon, the
                ones reaching out to first-time members, the ones bridging
                introductions at networking events.
              </p>
              {/* mt-f21 — paragraph gap */}
              <p className="text-body text-text-secondary mt-f21 leading-relaxed">
                It&apos;s a volunteer role. The ambassadors below put in real
                time on top of running their own businesses because they
                believe in what a strong chamber does for Medina.
              </p>
            </div>

            {/* space-y-f21 — between role cards */}
            <div className="space-y-f21">
              {roles.map((r) => (
                <div
                  key={r.title}
                  className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  {/* mb-f8 — title→body */}
                  <h3 className="text-h4 mb-f8">{r.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── BAND — Meet the Ambassadors grid ─────────────────── */}
      {/* py-f55/f89 — BAND tier, bg-secondary + border-y */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            {/* mb-f21 — header→grid gap */}
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                {/* mb-f8 — overline→heading */}
                <p className="text-overline text-cambridge mb-f8">
                  Meet the Team
                </p>
                <h2 className="text-h2">{ambassadors.length} Ambassadors</h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Volunteer chamber members serving Medina County, Ohio.
              </p>
            </div>

            {/* gap-f21 — ambassador card grid gap */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-f21">
              {ambassadors.map((a) => (
                <figure
                  key={a.name}
                  className="overflow-hidden bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] m-0 hover:border-cambridge/40 transition-colors"
                >
                  {/* Portrait card matches source orientation (every headshot is
                      portrait, ratios 0.67–1.0). object-[center_25%] anchors
                      the focal point to the upper quarter so eye-lines align
                      across a grid of varied source crops. */}
                  <div className="relative w-full aspect-[3/4]">
                    <Image
                      src={a.photo}
                      alt={`${a.name}, ${a.title} at ${a.company} — Greater Medina Chamber of Commerce Ambassador, Medina, Ohio`}
                      fill
                      className="object-cover object-[center_25%]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <figcaption className="sr-only">
                    {a.name}, {a.title} at {a.company}. Greater Medina Chamber
                    of Commerce Ambassador, Medina County, Ohio.
                  </figcaption>
                  {/* p-f21 — card interior padding */}
                  <div className="p-f21">
                    <h3 className="text-body font-bold text-text-primary">
                      {a.name}
                    </h3>
                    {/* mt-f3 — name→title micro-gap */}
                    <p className="text-body-sm text-text-secondary mt-f3">
                      {a.title}
                    </p>
                    <p className="text-caption font-semibold text-cambridge mt-f3">
                      {a.company}
                    </p>
                    {/* mt-f13 — body→links gap */}
                    <div className="mt-f13 flex flex-col gap-1">
                      <a
                        href={`mailto:${a.email}`}
                        className="text-caption text-text-tertiary hover:text-cambridge transition-colors truncate"
                      >
                        {a.email}
                      </a>
                      {a.website && (
                        <a
                          href={a.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption text-text-tertiary hover:text-cambridge transition-colors truncate"
                        >
                          {a.website
                            .replace(/^https?:\/\//, "")
                            .replace(/\/$/, "")}
                        </a>
                      )}
                    </div>
                  </div>
                </figure>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── CLOSER — Become an Ambassador CTA ─────────────────── */}
      {/* py-f55/f89 — CLOSER taper */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          {/* p-f34/f55 card padding, gap-f34 2-col gap */}
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                {/* mb-f8 — overline→heading */}
                <p className="text-overline text-cambridge mb-f8">Get Involved</p>
                <h2 className="text-h2">Become an Ambassador</h2>
                {/* mt-f13 — heading→body */}
                <p className="text-body-lg text-text-secondary mt-f13">
                  Ambassadors are active chamber members who want to give back
                  and grow their network at the same time. If you&apos;re a
                  member and the role sounds like you, reach out to Stephanie
                  Mueller and she&apos;ll walk you through what&apos;s involved.
                </p>
              </div>
              {/* space-y-f13 — button stack gap */}
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
                  href="mailto:stephanie@medinaohchamber.com?subject=Becoming%20a%20Chamber%20Ambassador"
                  className="
                    block w-full text-center py-f13 px-f21
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Email Stephanie Directly
                </a>
              </div>
            </div>
          </div>

          {/* mt-f34 — card→back-link gap */}
          <div className="mt-f34">
            <Link
              href="/about"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to About
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

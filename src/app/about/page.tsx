import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { chamberOffice, jaclyn, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

// ISR: re-render daily so the "years later" count (new Date() at build time)
// refreshes each New Year instead of freezing until the next deploy.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About the Chamber",
  description:
    "The Greater Medina Chamber of Commerce has championed and empowered Medina County's business community since 1938, through advocacy, connection, and leadership. Meet the team and learn what we stand for.",
  openGraph: {
    title: "About | Greater Medina Chamber of Commerce",
    description:
      "Championing and empowering Medina County's business community since 1938, through advocacy, connection, and leadership.",
  },
  alternates: { canonical: "/about" },
};

const coreValues = [
  {
    number: "01",
    title: "Advocate Relentlessly",
    tag: "Your voice at the table",
    desc: "We tirelessly champion policies that drive local business growth, representing you directly with city, county, and state decision-makers.",
  },
  {
    number: "02",
    title: "Build Strong Connections",
    tag: "Stronger together",
    desc: "We create the rooms, events, and platforms where Medina's business community connects, collaborates, and grows alongside one another.",
  },
  {
    number: "03",
    title: "Empower & Inspire Growth",
    tag: "Unlock your potential",
    desc: "We provide the events, tools, and resources that foster innovation, education, and success at every stage of business growth.",
  },
  {
    number: "04",
    title: "Create Lasting Impact",
    tag: "Enduring difference",
    desc: "Our efforts are built to compound, creating meaningful outcomes for members today and lasting change for Medina County tomorrow.",
  },
  {
    number: "05",
    title: "Champion Collective Leadership",
    tag: "Leading the way",
    desc: "We engage and support the dedicated volunteers, board members, and ambassadors who drive community growth from the inside.",
  },
];

const staff = [
  {
    name: "Jaclyn Ringstmeier, IOM",
    title: "Executive Director",
    email: jaclyn.email,
    photo:
      "/images/people/staff/jaclyn-ringstmeier-executive-director-greater-medina-chamber.jpg",
  },
  {
    name: "Stephanie Mueller",
    title: "Membership & Events Coordinator",
    email: stephanie.email,
    photo:
      "/images/people/staff/stephanie-mueller-membership-events-coordinator-greater-medina-chamber.jpg",
  },
];

const quickLinks = [
  {
    label: "Board of Directors",
    href: "/about/board",
    description: "Meet the 2026 board and staff leadership.",
  },
  {
    label: "Ambassadors",
    href: "/about/ambassadors",
    description: "Volunteers who welcome and connect new members.",
  },
  {
    label: "Advocacy",
    href: "/about/advocacy",
    description: "How we fight for a pro-business environment.",
  },
  {
    label: "Hall of Fame",
    href: "/about/hall-of-fame",
    description: "Medina County's most impactful business leaders.",
  },
  {
    label: "Contact Us",
    href: "/about/contact",
    description: "Reach the chamber office directly.",
  },
  {
    label: "News & Magazine",
    href: "/news",
    description: "Chamber updates, member news, and the magazine.",
  },
];

export default async function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About | Greater Medina Chamber of Commerce",
    description:
      "The Greater Medina Chamber of Commerce has championed Medina County's business community since 1938, through advocacy, connection, and leadership.",
    url: "https://medinachamber.com/about",
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      foundingDate: "1938",
      address: {
        "@type": "PostalAddress",
        streetAddress: "139 N. Court Street, Suite A",
        addressLocality: "Medina",
        addressRegion: "OH",
        postalCode: "44256",
        addressCountry: "US",
      },
      telephone: "+13307238773",
      email: chamberOffice.email,
      employee: [
        {
          "@type": "Person",
          name: "Jaclyn Ringstmeier IOM",
          jobTitle: "Executive Director",
          email: jaclyn.email,
          worksFor: { "@type": "Organization", name: "Greater Medina Chamber of Commerce" },
        },
        {
          "@type": "Person",
          name: "Stephanie Mueller",
          jobTitle: "Membership & Events Coordinator",
          email: stephanie.email,
          worksFor: { "@type": "Organization", name: "Greater Medina Chamber of Commerce" },
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina Chamber building entrance backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/about/medina-chamber-about-hero.webp"
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
          <p className="text-overline text-cambridge mb-f8">About</p>
          <h1 className="text-display">
            <span className="block">Greater Medina</span>
            <span className="block text-accent">Chamber</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            We champion and empower greater Medina&apos;s business community, 
            driving growth through advocacy, connection, and leadership since 1938.
          </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid grid-cols-3 gap-f21">
            {[
              { stat: "1938", label: "Founded" },
              { stat: "50+", label: "Events Per Year" },
              { stat: "500+", label: "Member Businesses" },
            ].map((item) => (
              <div
                key={item.label}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center"
              >
                <p className="text-h2 text-oxford [[data-theme=dark]_&]:text-cambridge">
                  {item.stat}
                </p>
                <p className="text-caption text-text-tertiary mt-f3 uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Our Story */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted courthouse backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-county-courthouse-sunset.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl">
              <p className="text-overline text-cambridge mb-f8">Our Story</p>
              <h2 className="text-h2">Built in 1938. Still building.</h2>
              <div className="mt-f13 space-y-f21 text-body text-text-secondary leading-relaxed">
                <p>
                  In 1938, Medina&apos;s businesses stood largely alone. They
                  needed connection, a voice, and someone to represent their
                  interests when decisions were made in City Hall and at the
                  Statehouse. The Greater Medina Chamber of Commerce was built to
                  be exactly that, a dual force of community connection and
                  business advocacy.
                </p>
                <p>
                  Nearly nine decades later, that dual approach still defines
                  us. Medina County businesses are
                  better connected and better represented for it. We&apos;re not a
                  networking club, we&apos;re the infrastructure that helps Medina
                  businesses flourish.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Core Values */}
      <section className="relative overflow-hidden py-f89 lg:py-f144">
        {/* Backdrop removed 2026-08-03: adjacent sections (Our Story, Our
            Team) carry ghosts, and backdrops must alternate with plain
            sections — never stack. */}
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="max-w-2xl mb-f21">
            <p className="text-overline text-cambridge mb-f8">What We Stand For</p>
            <h2 className="text-h2">Five values that guide everything.</h2>
            <p className="text-body-lg text-text-secondary mt-f13">
              These aren&apos;t wall decor. They&apos;re the standards we hold
              ourselves to, and the lens we use to make every decision about
              how we serve our members and our community.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-f21">
          {coreValues.map((value, i) => (
            <FadeIn key={value.number} delay={i * 80}>
              <div
                className="
                  h-full p-f34
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 transition-colors
                "
              >
                <p className="text-display text-cambridge/20 leading-none font-bold">
                  {value.number}
                </p>
                <h3 className="text-h3 mt-f13">{value.title}</h3>
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mt-f3">
                  {value.tag}
                </p>
                <p className="text-body-sm text-text-secondary mt-f13 leading-relaxed">
                  {value.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
        </div>
      </section>

      {/* Our Team + Location */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted chamber-meeting backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-team-meeting.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl mb-f21">
              <p className="text-overline text-cambridge mb-f8">Our Team</p>
              <h2 className="text-h2">The people behind the chamber.</h2>
              <p className="text-body-lg text-text-secondary mt-f13">
                A small staff with deep roots in Medina County, plus a volunteer
                board members and ambassadors who make everything work.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-f21 max-w-3xl">
            {staff.map((s, i) => (
              <FadeIn key={s.name} delay={i * 100}>
                <div className="overflow-hidden bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                  <div className="relative w-full aspect-[4/3]">
                    <Image
                      src={s.photo}
                      alt={`${s.name}, ${s.title} at the Greater Medina Chamber of Commerce in Medina, Ohio`}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                  <div className="p-f21">
                    <h3 className="text-h4">{s.name}</h3>
                    <p className="text-body-sm text-cambridge mt-f3 font-bold">{s.title}</p>
                    <a
                      href={`mailto:${s.email}`}
                      className="inline-block mt-f8 text-caption text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      {s.email}
                    </a>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          <div className="mt-f21 flex flex-wrap gap-f21">
            <Link
              href="/about/board"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              Meet the Board of Directors →
            </Link>
            <Link
              href="/about/ambassadors"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              Meet the Ambassadors →
            </Link>
          </div>

          <FadeIn>
            <div className="mt-f34 p-f34 lg:p-f55 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
              <div className="grid md:grid-cols-2 gap-f34 items-center">
                <div>
                  <p className="text-overline text-cambridge mb-f8">Visit Us</p>
                  <h2 className="text-h2">Come by the office.</h2>
                  <div className="mt-f13 text-body text-text-secondary space-y-f3">
                    <p>139 N. Court Street, Suite A</p>
                    <p>Medina, OH 44256</p>
                    <p className="mt-f8 text-text-tertiary text-body-sm">
                      Monday – Friday &nbsp;·&nbsp; 10:00 AM – 4:00 PM
                    </p>
                  </div>
                  <div className="mt-f21 flex flex-wrap gap-f13">
                    <a
                      href="tel:+13307238773"
                      className="
                        inline-flex items-center px-f21 py-f13
                        bg-accent hover:bg-accent-hover
                        text-white font-bold text-body-sm
                        rounded-[var(--radius-md)]
                        transition-colors
                      "
                    >
                      (330) 723-8773
                    </a>
                    <a
                      href="https://maps.google.com/?q=139+N+Court+Street+Suite+A+Medina+OH+44256"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex items-center px-f21 py-f13
                        border border-border-primary hover:border-text-tertiary
                        text-text-primary font-bold text-body-sm
                        rounded-[var(--radius-md)]
                        transition-colors
                      "
                    >
                      Get Directions ↗
                    </a>
                  </div>
                </div>
                <div className="text-body text-text-secondary space-y-f8">
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                    One block from Historic Medina Square
                  </p>
                  <p>On-site parking lot available.</p>
                  <p>Additional parking at City Hall garage, no charge.</p>
                  <p>Wheelchair accessible entrance and parking.</p>
                  <p className="mt-f13">
                    <span className="font-bold text-text-primary">
                      General inquiries:{" "}
                    </span>
                    <a
                      href={mailto(chamberOffice.email)}
                      className="hover:text-cambridge transition-colors"
                    >{chamberOffice.email}</a>
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Quick Links + Join CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="max-w-2xl mb-f21">
            <p className="text-overline text-cambridge mb-f8">Explore More</p>
            <h2 className="text-h2">More about the chamber.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-f21">
            {quickLinks.map((link, i) => (
              <FadeIn key={link.href} delay={i * 60}>
                <Link
                  href={link.href}
                  className="
                    group block p-f21 h-full
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-cambridge/40 transition-colors
                  "
                >
                  <p className="text-body font-bold text-text-primary group-hover:text-cambridge transition-colors">
                    {link.label} →
                  </p>
                  <p className="text-caption text-text-tertiary mt-f8">
                    {link.description}
                  </p>
                </Link>
              </FadeIn>
            ))}
          </div>
        </FadeIn>

        <FadeIn>
          <div className="mt-f34 p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Membership</p>
                <h2 className="text-h2">
                  Ready to be part of what&apos;s building Medina?
                </h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Join the businesses in the Chamber network. Three
                  tiers, one community, a shared commitment to making Medina
                  County the best place in Ohio to run a business.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Apply for Membership →
                </Link>
                <Link
                  href="/membership/pricing"
                  className="
                    block w-full text-center py-f13 px-f21
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See Pricing & Tiers
                </Link>
                <Link
                  href="/about/contact"
                  className="
                    block w-full text-center py-f13 px-f21
                    text-cambridge font-bold text-body-sm
                    transition-colors hover:text-cambridge/80
                  "
                >
                  Talk to the Chamber
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

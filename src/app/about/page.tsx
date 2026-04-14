import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { totalCount } from "@/data/members";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "About the Chamber",
  description:
    "The Greater Medina Chamber of Commerce has championed and empowered Medina County's business community since 1938 — through advocacy, connection, and leadership. Meet the team and learn what we stand for.",
  openGraph: {
    title: "About — Greater Medina Chamber of Commerce",
    description:
      "Championing and empowering Medina County's business community since 1938 — through advocacy, connection, and leadership.",
  },
  alternates: { canonical: "/about" },
};

const coreValues = [
  {
    number: "01",
    title: "Advocate Relentlessly",
    tag: "Your voice at the table",
    desc: "We tirelessly champion policies that drive local business growth — representing you directly with city, county, and state decision-makers.",
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
    desc: "Our efforts are built to compound — creating meaningful outcomes for members today and lasting change for Medina County tomorrow.",
  },
  {
    number: "05",
    title: "Champion Collective Leadership",
    tag: "Leading the way",
    desc: "We engage and support the dedicated volunteers, board members, and committee leaders who drive community growth from the inside.",
  },
];

const staff = [
  {
    name: "Jaclyn Ringstmeier, IOM",
    title: "Executive Director",
    email: "jaclyn@medinaohchamber.com",
    photo:
      "/images/people/staff/jaclyn-ringstmeier-executive-director-greater-medina-chamber.jpg",
  },
  {
    name: "Stephanie Mueller",
    title: "Membership & Events Coordinator",
    email: "stephanie@medinaohchamber.com",
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

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">About</p>
        <h1 className="text-display">
          Greater Medina
          <br />
          <span className="text-accent">Chamber</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          We champion and empower greater Medina&apos;s business community —
          driving growth through advocacy, connection, and leadership since 1938.
        </p>
      </section>

      {/* ─── Core Purpose Callout ─────────────────────────── */}
      <FadeIn>
        <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
          <div className="relative max-w-3xl">
            <p className="text-overline text-cambridge mb-4">Our Core Purpose</p>
            <p className="text-h2 leading-tight">
              To champion and empower Medina&apos;s business community —
              driving growth through{" "}
              <span className="text-cambridge">advocacy</span>,{" "}
              <span className="text-cambridge">connection</span>, and{" "}
              <span className="text-cambridge">leadership</span>.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* ─── Stats Strip ──────────────────────────────────── */}
      <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { stat: "1938", label: "Founded" },
          { stat: `${totalCount}+`, label: "Member Businesses" },
          { stat: "30+", label: "Events Per Year" },
          { stat: "9", label: "Committees" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center"
          >
            <p className="text-h2 text-oxford">{item.stat}</p>
            <p className="text-caption text-text-tertiary mt-1 uppercase tracking-wider">
              {item.label}
            </p>
          </div>
        ))}
      </section>

      {/* ─── Our Story ────────────────────────────────────── */}
      <section className="mt-24 grid lg:grid-cols-[1fr_480px] gap-12 lg:gap-16 items-start">
        <FadeIn>
          <div>
            <p className="text-overline text-cambridge mb-4">Our Story</p>
            <h2 className="text-h2">
              From isolation to influence — and what comes next.
            </h2>
            <div className="mt-6 space-y-4 text-body text-text-secondary leading-relaxed">
              <p>
                In 1938, Medina&apos;s local businesses stood largely alone —
                facing the daily challenges of running a business in isolation.
                They needed connection. They needed a voice. And they needed
                someone to champion their interests when decisions were being
                made in City Hall and at the Statehouse.
              </p>
              <p>
                The Greater Medina Chamber of Commerce was built to be exactly
                that — a dual force of community connection and business
                advocacy. We organized networking events, developed educational
                programs, and established mentorship opportunities. We sat at
                the table with elected officials to make sure Medina&apos;s
                business voices were heard in the halls of power.
              </p>
              <p>
                Nearly 90 years later, that dual approach still defines us.
                Today, {totalCount}+ Medina County businesses stand taller,
                better connected, and better represented — shaping a thriving
                future together. We&apos;re not a networking club. We&apos;re
                the infrastructure that makes Medina a place where businesses
                don&apos;t just survive. They flourish.
              </p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={150}>
          <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <p className="text-overline text-cambridge mb-4">
              Positioning Statement
            </p>
            <p className="text-body text-text-primary leading-relaxed">
              For local businesses in Medina, Ohio seeking growth, support,
              and a voice at the table, the Greater Medina Chamber of Commerce
              is the leading local business organization that combines
              advocacy with community connection.
            </p>
            <p className="text-body-sm text-text-secondary mt-4 leading-relaxed">
              Unlike traditional networking groups or solo lobbying efforts,
              we ensure your business interests are represented in the halls
              of power while providing essential resources and networking
              opportunities to create a thriving, connected business community.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── Core Values ──────────────────────────────────── */}
      <section className="mt-24">
        <FadeIn>
          <div className="max-w-2xl mb-12">
            <p className="text-overline text-cambridge mb-4">
              What We Stand For
            </p>
            <h2 className="text-h2">Five values that guide everything.</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              These aren&apos;t wall decor. They&apos;re the standards we hold
              ourselves to — and the lens we use to make every decision about
              how we serve our members and our community.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreValues.map((value, i) => (
            <FadeIn key={value.number} delay={i * 80}>
              <div
                className="
                  h-full p-8
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 transition-colors
                "
              >
                <p className="text-display text-cambridge/20 leading-none font-bold">
                  {value.number}
                </p>
                <h3 className="text-h3 mt-4">{value.title}</h3>
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mt-1">
                  {value.tag}
                </p>
                <p className="text-body-sm text-text-secondary mt-4 leading-relaxed">
                  {value.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Our Team ─────────────────────────────────────── */}
      <section className="mt-24">
        <FadeIn>
          <div className="max-w-2xl mb-10">
            <p className="text-overline text-cambridge mb-4">Our Team</p>
            <h2 className="text-h2">The people behind the chamber.</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              A small staff with deep roots in Medina County — plus a volunteer
              board, committee leaders, and ambassadors who make everything
              work.
            </p>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
          {staff.map((s, i) => (
            <FadeIn key={s.name} delay={i * 100}>
              <div className="overflow-hidden bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                <div className="relative w-full aspect-[4/3]">
                  <Image
                    src={s.photo}
                    alt={s.name}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </div>
                <div className="p-8">
                  <h3 className="text-h4">{s.name}</h3>
                  <p className="text-body-sm text-cambridge mt-1 font-bold">{s.title}</p>
                  <a
                    href={`mailto:${s.email}`}
                    className="inline-block mt-3 text-caption text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    {s.email}
                  </a>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
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
      </section>

      {/* ─── Location ─────────────────────────────────────── */}
      <section className="mt-24 p-8 lg:p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-overline text-cambridge mb-4">Visit Us</p>
            <h2 className="text-h2">Come by the office.</h2>
            <div className="mt-6 space-y-1 text-body text-text-secondary">
              <p>139 N. Court Street, Suite A</p>
              <p>Medina, OH 44256</p>
              <p className="mt-4 text-text-tertiary text-body-sm">
                Monday – Friday &nbsp;·&nbsp; 10:00 AM – 4:00 PM
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="tel:+13307238773"
                className="
                  inline-flex items-center px-5 py-2.5
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
                  inline-flex items-center px-5 py-2.5
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
          <div className="text-body text-text-secondary space-y-2">
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-3">
              One block from Historic Medina Square
            </p>
            <p>On-site parking lot available.</p>
            <p>Additional parking at City Hall garage — no charge.</p>
            <p>Wheelchair accessible entrance and parking.</p>
            <p className="mt-4">
              <span className="font-semibold text-text-primary">
                General inquiries:{" "}
              </span>
              <a
                href="mailto:office@medinaohchamber.com"
                className="hover:text-cambridge transition-colors"
              >
                office@medinaohchamber.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Quick Links ──────────────────────────────────── */}
      <section className="mt-24">
        <FadeIn>
          <div className="max-w-2xl mb-8">
            <p className="text-overline text-cambridge mb-4">Explore More</p>
            <h2 className="text-h2">Go deeper on the chamber.</h2>
          </div>
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link, i) => (
            <FadeIn key={link.href} delay={i * 60}>
              <Link
                href={link.href}
                className="
                  group block p-6 h-full
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 transition-colors
                "
              >
                <p className="text-body font-bold text-text-primary group-hover:text-cambridge transition-colors">
                  {link.label} →
                </p>
                <p className="text-caption text-text-tertiary mt-2">
                  {link.description}
                </p>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Join CTA ─────────────────────────────────────── */}
      <FadeIn>
        <section className="mt-24 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-overline text-cambridge mb-4">Membership</p>
              <h2 className="text-h2">
                Ready to be part of what&apos;s building Medina?
              </h2>
              <p className="text-body-lg text-text-secondary mt-4">
                Join {totalCount}+ businesses in the Chamber network. Three
                tiers, one community, a shared commitment to making Medina
                County the best place in Ohio to run a business.
              </p>
            </div>
            <div className="space-y-4">
              <Link
                href="/membership/join"
                className="
                  block w-full text-center py-4 px-6
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
                  block w-full text-center py-3 px-6
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
                  block w-full text-center py-3 px-6
                  text-cambridge font-bold text-body-sm
                  transition-colors hover:text-cambridge/80
                "
              >
                Talk to the Chamber
              </Link>
            </div>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { totalCount } from "@/data/members";

export const metadata: Metadata = {
  title: "About the Chamber",
  description:
    "The Greater Medina Chamber of Commerce has championed Medina County's business community since 1938. Learn about our mission, staff, and the people behind the chamber.",
  openGraph: {
    title: "About — Greater Medina Chamber of Commerce",
    description:
      "Championing and empowering Medina County's business community since 1938 — through advocacy, connection, and leadership.",
  },
  alternates: { canonical: "/about" },
};

const staff = [
  {
    name: "Jaclyn Ringstmeier, IOM",
    title: "Executive Director",
    email: "jaclyn@medinaohchamber.com",
    photo: "/images/people/staff/jaclyn-ringstmeier-executive-director-greater-medina-chamber.jpg",
  },
  {
    name: "Stephanie Mueller",
    title: "Membership & Events Coordinator",
    email: "stephanie@medinaohchamber.com",
    photo: "/images/people/staff/stephanie-mueller-membership-events-coordinator-greater-medina-chamber.jpg",
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
      {/* Hero */}
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

      {/* Mission + stats */}
      <section className="mt-20 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-h2">Our Mission</h2>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            The Greater Medina Chamber of Commerce exists to connect, support,
            and advocate for the businesses and professionals that make Medina
            County thrive. We bring together companies of every size and
            sector — from Main Street storefronts to regional employers — to
            build a stronger, more prosperous community for everyone.
          </p>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            Our vision is a county where businesses know each other, back
            each other, and grow together — where the tools, relationships,
            and advocacy are already in place when you need them.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { stat: "1938", label: "Founded" },
            { stat: `${totalCount}+`, label: "Member businesses" },
            { stat: "30+", label: "Events per year" },
            { stat: "Medina County", label: "Our community" },
          ].map((item) => (
            <div
              key={item.label}
              className="p-6 bg-oxford text-white rounded-[var(--radius-lg)] text-center"
            >
              <p className="text-h2 text-cambridge font-bold">{item.stat}</p>
              <p className="text-caption text-white/70 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Staff */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Our Team</h2>
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
          {staff.map((s) => (
            <div
              key={s.name}
              className="overflow-hidden bg-oxford text-white rounded-[var(--radius-lg)]"
            >
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
                <h3 className="text-h4 text-white">{s.name}</h3>
                <p className="text-body-sm text-cambridge mt-1">{s.title}</p>
                <a
                  href={`mailto:${s.email}`}
                  className="inline-block mt-3 text-caption text-white/60 hover:text-white transition-colors"
                >
                  {s.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Location */}
      <section className="mt-20 p-8 lg:p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-h2">Visit Us</h2>
            <div className="mt-4 space-y-2 text-body text-text-secondary">
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
          <div className="text-body text-text-secondary space-y-1">
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-3">
              One block from Historic Medina Square
            </p>
            <p>On-site parking lot available.</p>
            <p>Additional parking at City Hall garage — no charge.</p>
            <p className="mt-4">
              <span className="font-semibold text-text-primary">General inquiries: </span>
              <a href="mailto:office@medinaohchamber.com" className="hover:text-cambridge transition-colors">
                office@medinaohchamber.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Explore More</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="
                group p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary transition-colors
              "
            >
              <p className="text-body-sm font-bold text-text-primary group-hover:text-cambridge transition-colors">
                {link.label} →
              </p>
              <p className="text-caption text-text-tertiary mt-1">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2 text-white">Ready to join the chamber?</h2>
            <p className="text-body-lg text-white/70 mt-4">
              With {totalCount}+ member businesses, the Greater Medina Chamber connects
              you to the people, programs, and resources that move your
              business forward.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
                bg-cambridge hover:bg-cambridge/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Become a Member →
            </Link>
            <Link
              href="/about/contact"
              className="
                block w-full text-center py-3 px-6
                border border-white/30 hover:border-white/60
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Contact the Chamber
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

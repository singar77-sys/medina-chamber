import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Chamber Ambassadors",
  description:
    "Meet the Greater Medina Chamber of Commerce Ambassadors — volunteer member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber at events throughout Medina County.",
  openGraph: {
    title: "Chamber Ambassadors — Greater Medina Chamber of Commerce",
    description:
      "Volunteer member representatives who welcome new businesses and represent the chamber across Medina County.",
  },
  alternates: { canonical: "/about/ambassadors" },
};

const ambassadors = [
  "Danielle Litton",
  "Matt Strehle",
  "Kimberly Valco",
  "Claus Meyer",
  "Cindy Farnham",
  "Cindy Phillips",
  "Sam Pietrangelo",
];

const roles = [
  {
    title: "Welcome New Members",
    description:
      "Ambassadors personally greet businesses when they join the chamber — a handshake and a face that says \"you made a good call.\"",
  },
  {
    title: "Ribbon Cuttings",
    description:
      "When a member opens a new location or celebrates a milestone, ambassadors show up with scissors and enthusiasm.",
  },
  {
    title: "Event Representation",
    description:
      "Ambassadors attend chamber events, mixers, and community functions as the face of the organization.",
  },
  {
    title: "Member Retention",
    description:
      "They check in with members throughout the year — making sure businesses are getting value from their membership.",
  },
];

export default function AmbassadorsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Volunteers</p>
        <h1 className="text-display">
          Chamber
          <br />
          <span className="text-accent">Ambassadors</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Ambassadors are volunteer chamber members who serve as the friendly
          face of the Greater Medina Chamber. They welcome new businesses,
          attend ribbon cuttings, and make sure every member feels at home in
          the community.
        </p>
      </section>

      {/* What they do */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">What Ambassadors Do</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((r) => (
            <div
              key={r.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h3 className="text-h4 mb-3">{r.title}</h3>
              <p className="text-body-sm text-text-secondary">{r.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ambassador list */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Meet the Ambassadors</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ambassadors.map((name) => (
            <div
              key={name}
              className="flex items-center gap-4 p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="w-10 h-10 rounded-full bg-cambridge/20 flex items-center justify-center shrink-0 text-body-sm font-bold text-cambridge">
                {name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
              </div>
              <div>
                <p className="text-body font-semibold text-text-primary">{name}</p>
                <p className="text-caption text-cambridge font-bold mt-0.5">Ambassador</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="max-w-2xl">
          <h2 className="text-h2 text-white">Become an Ambassador</h2>
          <p className="text-body-lg text-white/70 mt-4">
            Ambassadors are active chamber members who want to give back and
            expand their network. If you&apos;re a member and interested in
            volunteering, reach out to Stephanie Mueller.
          </p>
          <div className="mt-8">
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-6 py-3
                bg-cambridge hover:bg-cambridge/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Get in Touch →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Compass Leadership Program",
  description:
    "The Compass Program is a professional leadership development initiative by the Greater Medina Chamber of Commerce, in partnership with the Center for Immersive Leadership. Five interactive sessions covering self-awareness, communication, well-being, and community citizenship.",
  openGraph: {
    title: "Compass Leadership Program — Greater Medina Chamber of Commerce",
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
    description: "Team members your organization wants to invest in — Compass is a retention and development tool.",
  },
];

export default function CompassPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Leadership Development</p>
        <h1 className="text-display">
          Compass
          <br />
          <span className="text-accent">Program</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          A five-session professional development program designed to help
          Medina County professionals grow in self-awareness, leadership
          skills, and community engagement — at every stage of their career.
        </p>
        <p className="text-body-sm text-text-tertiary mt-4">
          Presented by the{" "}
          <span className="text-text-secondary font-semibold">
            Greater Medina Chamber of Commerce
          </span>{" "}
          in partnership with the{" "}
          <span className="text-text-secondary font-semibold">
            Center for Immersive Leadership
          </span>
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
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
      </section>

      {/* Program overview */}
      <section className="mt-20 grid lg:grid-cols-3 gap-6">
        {[
          { label: "Format", value: "5 interactive sessions\nFebruary – May" },
          { label: "Location", value: "Chamber Office\n139 N. Court Street, Medina" },
          { label: "Investment", value: "$995 per participant" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
          >
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
              {item.label}
            </p>
            <p className="text-body font-semibold text-text-primary whitespace-pre-line">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Sessions */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">The Five Sessions</h2>
        <div className="space-y-4">
          {sessions.map((s) => (
            <div
              key={s.number}
              className="grid sm:grid-cols-[64px_1fr_1fr] gap-4 p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-oxford/10 text-oxford font-bold text-h4 shrink-0">
                {s.number}
              </div>
              <div>
                <h3 className="text-h4 leading-snug">{s.title}</h3>
                <p className="text-caption text-cambridge font-bold mt-1">{s.duration}</p>
                <p className="text-caption text-text-tertiary mt-0.5">{s.includes}</p>
              </div>
              <div className="flex flex-wrap gap-2 content-start">
                {s.topics.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 text-caption bg-bg-primary border border-border-secondary rounded-full text-text-secondary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Who Should Apply</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audience.map((a) => (
            <div
              key={a.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h3 className="text-h4 mb-3">{a.title}</h3>
              <p className="text-body-sm text-text-secondary">{a.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">Ready to invest in your leadership?</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              Compass runs annually. Each cohort is limited in size to keep
              the experience intentional and the connections real. Contact the
              Chamber to learn about the next cohort.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/about/contact"
              className="
                block w-full text-center py-3 px-6
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
                block w-full text-center py-3 px-6
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              (330) 723-8773
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hall of Fame",
  description:
    "The Greater Medina Chamber of Commerce Hall of Fame, established in 1979, honors individuals and organizations who have made extraordinary contributions to Medina County's business community and quality of life.",
  openGraph: {
    title: "Hall of Fame — Greater Medina Chamber of Commerce",
    description:
      "Established in 1979, honoring the people and organizations that shaped Medina County into an exceptional place to live and work.",
  },
  alternates: { canonical: "/about/hall-of-fame" },
};

const inductees = [
  "Elbridge Moxley",
  "Elijah Boardman",
  "Fred Greenwood",
  "Letha House",
  "Ralph Waite",
  "H.G. Blake",
  "John W. Brown",
  "Howard E. Clagget",
  "Freda Snyder",
  "Windsor Kellogg",
  "A.I. Root",
  "Sydney Fenn",
  "William C. Henschel",
  "Andrew Karson",
  "Elmer Zarney",
  "Bert Humpal",
  "Donald Simmons",
  "William Batchelder Jr.",
  "Charles E. Hawley",
  "William Kelly",
  "Jim Gerspacher",
  "Carl Abell",
  "Harold Thoburn",
  "William Batchelder III",
  "Charles F. Clark",
  "DeLorre Haddad",
  "Harold Simmons",
  "Steve Stephenson",
  "Pam Miller",
  "Macy Hallock Sr.",
  "Elbridge Gibbs",
  "Bill Bittner",
  "Barbara Dzur",
  "Tad Coleman",
  "George Paidas",
  "Lloyd Vaughn",
  "Gary Hallman",
  "Friends of the Cemetery",
];

const categories = [
  {
    title: "Posthumous Individual",
    description:
      "Recognizes individuals no longer living who made enduring contributions to Medina County's business community and civic life.",
  },
  {
    title: "Living Individual",
    description:
      "Honors living individuals whose leadership, service, and impact have significantly strengthened the greater Medina area.",
  },
  {
    title: "Outstanding Organization",
    description:
      "Celebrates organizations that have gone above and beyond to advance the socioeconomic foundation of Medina County.",
  },
];

export default function HallOfFamePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">About</p>
        <h1 className="text-display">
          Hall of
          <br />
          <span className="text-accent">Fame</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Established in 1979, the Hall of Fame honors the people and
          organizations who have shaped Medina County into an exceptional
          place to live and work.
        </p>
      </section>

      {/* About the program */}
      <section className="mt-20 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-h2">About the Program</h2>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            The Greater Medina Chamber of Commerce Hall of Fame was established
            in 1979 as a way to recognize those who have given most to our
            community. The program typically convenes every five years,
            bringing together the business community to celebrate its most
            distinguished contributors.
          </p>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            In 1981, eligibility was broadened to include anyone who has
            strengthened the socioeconomic foundation of the Medina area. By
            1983, three distinct award categories were introduced to more fully
            recognize the range of contributions that define civic and business
            excellence.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
            Award Categories
          </p>
          {categories.map((c) => (
            <div
              key={c.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h3 className="text-h4 mb-2">{c.title}</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Inductees */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">
          Inductees — {inductees.length} Honorees
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {inductees.map((name) => {
            const initials = name
              .split(" ")
              .filter((w) => /^[A-Z]/.test(w))
              .map((w) => w[0])
              .slice(0, 2)
              .join("");
            return (
              <div
                key={name}
                className="flex items-center gap-3 p-4 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <div className="w-10 h-10 rounded-full bg-oxford/10 flex items-center justify-center shrink-0">
                  <span className="text-caption font-bold text-oxford">{initials}</span>
                </div>
                <p className="text-body-sm font-semibold text-text-primary leading-snug">
                  {name}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 grid md:grid-cols-2 gap-6">
        <div className="p-8 bg-oxford text-white rounded-[var(--radius-lg)]">
          <h2 className="text-h3 text-white">Know a nominee?</h2>
          <p className="text-body text-white/70 mt-3 leading-relaxed">
            The Hall of Fame convenes approximately every five years. If you
            know someone whose contributions to Medina County deserve
            recognition, reach out to the chamber to learn about the nomination
            process.
          </p>
          <Link
            href="/about/contact"
            className="
              inline-flex items-center mt-5 px-5 py-2.5
              bg-cambridge hover:bg-cambridge/90
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Contact the Chamber →
          </Link>
        </div>

        <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <h2 className="text-h3">Explore More</h2>
          <p className="text-body text-text-secondary mt-3 leading-relaxed">
            The Hall of Fame is just one way the chamber celebrates the people
            who drive Medina County forward. Explore our other recognition
            programs.
          </p>
          <Link
            href="/programs/athena-awards"
            className="
              inline-flex items-center mt-5 px-5 py-2.5
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Athena Awards →
          </Link>
        </div>
      </section>

      {/* Back link */}
      <div className="mt-12">
        <Link
          href="/about"
          className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
        >
          ← Back to About
        </Link>
      </div>
    </div>
  );
}

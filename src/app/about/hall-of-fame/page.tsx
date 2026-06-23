import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Hall of Fame",
  description:
    "The Greater Medina Chamber of Commerce Hall of Fame, established in 1979, honors individuals and organizations who have made extraordinary contributions to Medina County's business community and quality of life.",
  openGraph: {
    title: "Hall of Fame | Greater Medina Chamber of Commerce",
    description:
      "Established in 1979, honoring the people and organizations that shaped Medina County into an exceptional place to live and work.",
  },
  alternates: { canonical: "/about/hall-of-fame" },
};

const inductees = [
  { name: "Elbridge Moxley",        photo: "/images/people/hall-of-fame/elbridge-moxley-medina-chamber.jpg" },
  { name: "Elijah Boardman",        photo: "/images/people/hall-of-fame/elijah-boardman-medina-chamber.jpg" },
  { name: "Fred Greenwood",         photo: "/images/people/hall-of-fame/fred-greenwood-medina-chamber.jpg" },
  { name: "Letha House",            photo: "/images/people/hall-of-fame/letha-house-medina-chamber.jpg" },
  { name: "Ralph Waite",            photo: "/images/people/hall-of-fame/ralph-waite-medina-chamber.jpg" },
  { name: "H.G. Blake",             photo: "/images/people/hall-of-fame/h-g-blake-medina-chamber.jpg" },
  { name: "John W. Brown",          photo: "/images/people/hall-of-fame/john-w-brown-medina-chamber.jpeg" },
  { name: "Howard E. Clagget",      photo: "/images/people/hall-of-fame/howard-e-clagget-medina-chamber.jpg" },
  { name: "Freda Snyder",           photo: "/images/people/hall-of-fame/freda-snyder-medina-chamber.jpg" },
  { name: "Windsor Kellogg",        photo: "/images/people/hall-of-fame/windsor-kellogg-medina-chamber.jpg" },
  { name: "A.I. Root",              photo: "/images/people/hall-of-fame/a-i-root-medina-chamber.jpg" },
  { name: "Sydney Fenn",            photo: "/images/people/hall-of-fame/syndey-fenn-medina-chamber.jpg" },
  { name: "William C. Henschel",    photo: "/images/people/hall-of-fame/william-c-henschel-medina-chamber.jpg" },
  { name: "Andrew Karson",          photo: "/images/people/hall-of-fame/andrew-karson-medina-chamber.jpg" },
  { name: "Elmer Zarney",           photo: "/images/people/hall-of-fame/elmer-zarney-medina-chamber.jpg" },
  { name: "Bert Humpal",            photo: "/images/people/hall-of-fame/bert-humpal-medina-chamber.jpg" },
  { name: "Donald Simmons",         photo: "/images/people/hall-of-fame/donald-simmons-medina-chamber.jpg" },
  { name: "William Batchelder Jr.", photo: "/images/people/hall-of-fame/william-batchelder-jr-medina-chamber.jpg" },
  { name: "Charles E. Hawley",      photo: "/images/people/hall-of-fame/charles-e-hawley-medina-chamber.jpg" },
  { name: "William Kelly",          photo: "/images/people/hall-of-fame/william-kelly-medina-chamber.jpg" },
  { name: "Jim Gerspacher",         photo: "/images/people/hall-of-fame/jim-gerspacher-medina-chamber.jpg" },
  { name: "Carl Abell",             photo: "/images/people/hall-of-fame/carl-abell-medina-chamber.jpg" },
  { name: "Harold Thoburn",         photo: "/images/people/hall-of-fame/harold-thoburn-medina-chamber.jpg" },
  { name: "William Batchelder III", photo: "/images/people/hall-of-fame/william-batchelder-iii-medina-chamber.jpg" },
  { name: "Charles F. Clark",       photo: "/images/people/hall-of-fame/charles-f-clark-medina-chamber.jpg" },
  { name: "DeLorre Haddad",         photo: "/images/people/hall-of-fame/delorre-haddad-medina-chamber.jpg" },
  { name: "Harold Simmons",         photo: "/images/people/hall-of-fame/harold-simmons-medina-chamber.jpg" },
  { name: "Steve Stephenson",       photo: "/images/people/hall-of-fame/steve-stephenson-medina-chamber.jpg" },
  { name: "Jones",                  photo: "/images/people/hall-of-fame/jones-medina-chamber.jpg" },
  { name: "Pam Miller",             photo: "/images/people/hall-of-fame/pam-miller-medina-chamber.jpg" },
  { name: "Macy Hallock Sr.",       photo: "/images/people/hall-of-fame/macy-hallock-sr-medina-chamber.jpg" },
  { name: "Elbridge Gibbs",         photo: "/images/people/hall-of-fame/elbridge-gibbs-medina-chamber.jpg" },
  { name: "Bill Bittner",           photo: "/images/people/hall-of-fame/bill-bittner-medina-chamber.jpg" },
  { name: "Barbara Dzur",           photo: "/images/people/hall-of-fame/barbara-dzur-medina-chamber.jpg" },
  { name: "Tad Coleman",            photo: "/images/people/hall-of-fame/tad-coleman-medina-chamber.jpg" },
  { name: "George Paidas",          photo: "/images/people/hall-of-fame/george-paidas-medina-chamber.jpg" },
  { name: "Lloyd Vaughn",           photo: "/images/people/hall-of-fame/lloyd-vaughn-medina-chamber.jpg" },
  { name: "Gary Hallman",           photo: "/images/people/hall-of-fame/gary-hallman-medina-chamber.jpg" },
  { name: "Friends of the Cemetery", photo: "/images/people/hall-of-fame/friends-of-the-cemetery-medina-chamber.jpg" },
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
    <>
      
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina heritage shadowbox — antique square photo + A.I. Root bee block — backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/people/hall-of-fame/medina-chamber-hall-of-fame-heritage.webp"
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
              <span className="block">Hall of</span>
              <span className="block text-accent">Fame</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Established in 1979, the Hall of Fame honors the people and
              organizations who have shaped Medina County into an exceptional
              place to live and work.
            </p>
          </div>
        </div>
      </section>

      {/* About + Categories */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-start">
            <div>
              <h2 className="text-h2">About the Program</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                The Greater Medina Chamber of Commerce Hall of Fame was
                established in 1979 as a way to recognize those who have given
                most to our community. The program typically convenes every five
                years, bringing together the business community to celebrate its
                most distinguished contributors.
              </p>
              <p className="text-body text-text-secondary mt-f21 leading-relaxed">
                In 1981, eligibility was broadened to include anyone who has
                strengthened the socioeconomic foundation of the Medina area. By
                1983, three distinct award categories were introduced to more
                fully recognize the range of contributions that define civic and
                business excellence.
              </p>
            </div>

            {/* Categories — space-y-f21 (21px) between cards, p-f21 interior */}
            <div className="space-y-f21">
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                Award Categories
              </p>
              {categories.map((c) => (
                <div
                  key={c.title}
                  className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <h3 className="text-h4 mb-f8">{c.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {c.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Inductees grid */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">
              Inductees, {inductees.length} Honorees
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-f13 lg:gap-f21">
              {inductees.map((inductee) => (
                <figure key={inductee.name} className="flex flex-col items-center gap-f8 m-0">
                  <div className="relative w-full aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-bg-primary border border-border-secondary">
                    <Image
                      src={inductee.photo}
                      alt={`${inductee.name}, Greater Medina Chamber of Commerce Hall of Fame inductee`}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
                    />
                  </div>
                  <p className="text-caption font-bold text-text-primary text-center leading-snug">
                    {inductee.name}
                  </p>
                  <figcaption className="sr-only">
                    {inductee.name}, Greater Medina Chamber of Commerce Hall of Fame inductee, Medina County, Ohio business leader
                  </figcaption>
                </figure>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA cards */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="grid md:grid-cols-2 gap-f21">
            <div className="p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <h2 className="text-h3">Know a nominee?</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                The Hall of Fame convenes approximately every five years. If you
                know someone whose contributions to Medina County deserve
                recognition, reach out to the chamber to learn about the
                nomination process.
              </p>
              <Link
                href="/about/contact"
                className="
                  inline-flex items-center mt-f21 px-f21 py-f13
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Contact the Chamber →
              </Link>
            </div>

            <div className="p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <h2 className="text-h3">Explore More</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                The Hall of Fame is just one way the chamber celebrates the
                people who drive Medina County forward. Explore our other
                recognition programs.
              </p>
              <Link
                href="/programs/athena-awards"
                className="
                  inline-flex items-center mt-f21 px-f21 py-f13
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Athena Awards →
              </Link>
            </div>
          </div>

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

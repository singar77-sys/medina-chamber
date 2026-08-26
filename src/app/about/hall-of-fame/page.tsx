import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { InducteeGrid } from "./InducteeGrid";
import { type Inductee } from "./shared";

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

const inductees: Inductee[] = [
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
  { name: "Sydney Fenn",            photo: "/images/people/hall-of-fame/sydney-fenn-medina-chamber.jpg" },
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

  // Class of 2023
  {
    name: "Michael K. Baach",
    year: 2023,
    category: "Living Individual",
    photo: "/images/people/hall-of-fame/michael-k-baach-medina-chamber.jpg",
    bio: "Former President and CEO of Philpott Solutions Group and Executive Vice President and co-founder of Corrpro Companies, which grew into a $200 million publicly traded corrosion-engineering leader. Past Chairman of the Greater Medina Chamber of Commerce Board, with service on the boards of Southwest General Health Center, Hospice of Medina County, and the National Association of Corrosion Engineers. Partnered with the University of Akron to launch the nation's first Corrosion Engineering undergraduate program.",
  },
  {
    name: "James Cameron Gowe",
    year: 2023,
    category: "Posthumous Individual",
    photo: "/images/people/hall-of-fame/james-cameron-gowe-medina-chamber.jpg",
    bio: "Led 620 Corporation and 620 Construction, building many of Medina's commercial and industrial properties, and partnered with his family to restore Medina's aging housing stock, including the King-Deibel family home on North Broadway. A steady supporter of the American Red Cross, Project LEARN, Feeding Medina County, and the Children's Center of Medina County.",
  },
  {
    name: "Norbert “Nobby” Lewandowski",
    year: 2023,
    category: "Living Individual",
    photo: "/images/people/hall-of-fame/norbert-nobby-lewandowski-medina-chamber.jpg",
    bio: "Kent State University's first baseball scholarship recipient and a former professional pitcher in the Pittsburgh Pirates organization, later a CPA and co-owner of Lewandowski & Company. Co-founded the Medina County Community Fund in 1994, which has awarded more than $700,000 in grants to local nonprofits, and now travels the country as a motivational speaker and business coach through “Nobby Speaks.”",
  },
  {
    name: "Debra Lynn-Schmitz",
    year: 2023,
    category: "Living Individual",
    photo: "/images/people/hall-of-fame/debra-lynn-schmitz-medina-chamber.jpg",
    bio: "Spent 26 years with the Greater Medina Chamber of Commerce — 7 as Events & Communications Manager and 19 as Executive Director — guiding the chamber to national accreditation through the U.S. Chamber of Commerce. Chaired the Chamber of Commerce Executives of Ohio board and helped found Main Street Medina and bring the Young Entrepreneurs Academy to Medina.",
  },
  {
    name: "Jeffrey J. Palker",
    year: 2023,
    category: "Living Individual",
    photo: "/images/people/hall-of-fame/jeffrey-j-palker-medina-chamber.jpg",
    bio: "A career banker at Old Phoenix Bank who rose from teller to senior loan officer, and a past Chairman of the Greater Medina Chamber of Commerce Board. Founding Treasurer of the Hospice of Medina County board and the Medina County Performing Arts Foundation, and helped bring the Ohio Ballet, Cleveland Jazz Orchestra, and U.S. Air Force Band of Flight to Medina's public square.",
  },
  {
    name: "Robert A. Rapp",
    year: 2023,
    category: "Living Individual",
    photo: "/images/people/hall-of-fame/robert-a-rapp-medina-chamber.jpg",
    bio: "Owner of Homestead Insurance Agency and a Vietnam veteran, following three generations of family Hall of Fame inductees. Served as Board President of both the Medina Area and Brunswick Area Chambers of Commerce, chaired the Medina County Community Fund board, and is a graduate of Leadership Medina County's charter class.",
  },
  {
    name: "Becky L. Shotwell",
    year: 2023,
    category: "Living Individual",
    photo: "/images/people/hall-of-fame/becky-l-shotwell-medina-chamber.jpg",
    bio: "President and owner of Stop 'n Go of Medina Inc., growing the company to ten locations, and a past Board President of the Ohio Association of Convenience Stores. Medina Rotary Club's first female member and founding president of the Medina Sunrise Rotary, with sixteen years on the Medina General Hospital Board of Trustees.",
  },
  {
    name: "Medina County Historical Society",
    year: 2023,
    category: "Outstanding Organization",
    bio: "For more than 100 years, has preserved Medina County's documents, artifacts, oral histories, and photographs. Restored and operates two public museums — the 1886 John Smart House and the 1890 McDowell-Phillips House — both honored with local and State of Ohio awards.",
  },
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
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
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
            <h2 className="text-overline text-cambridge mb-f8">
              Inductees, {inductees.length} Honorees
            </h2>
            <p className="text-body-sm text-text-tertiary mb-f21">
              Highlighted profiles are clickable for the full story.
            </p>
            <InducteeGrid inductees={inductees} />
          </FadeIn>
        </div>
      </section>

      {/* CTA cards — courthouse-at-sunset ghost (nature/landmark, no people —
          Mark 2026-08-26); 0.18 band + /75 cards per the Band Book */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-county-courthouse-sunset.webp"
            alt=""
            fill
            className="object-cover opacity-[0.18]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <FadeIn>
          <div className="grid md:grid-cols-2 gap-f21">
            <div className="p-f34 bg-bg-secondary/75 border border-border-secondary rounded-[var(--radius-lg)]">
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

            <div className="p-f34 bg-bg-secondary/75 border border-border-secondary rounded-[var(--radius-lg)]">
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
                  bg-emerald hover:bg-emerald/90
                  text-white font-bold text-body-sm
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
        </div>
      </section>
    </>
  );
}

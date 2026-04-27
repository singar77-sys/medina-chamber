import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { safeJsonLd } from "@/lib/json-ld";

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
  {
    name: "Kari Deeks",
    title: "Treasury Management Officer",
    company: "First Federal of Lakewood",
    email: "kdeeks@ffl.net",
    website: "https://www.ffl.bank/",
    photo: "/images/people/ambassadors/medina-chamber-ambassador-03.jpg",
  },
  {
    name: "Brittney Esser",
    title: "Escrow Processor",
    company: "Title Select",
    email: "brittney@titleselect.net",
    website: "https://www.titleselect.net",
    photo: "/images/people/ambassadors/a-woman-with-curly-shoulder-length-gray-hair-wearing-clear-glasses-and-a-sleeveless-light-purple-top-medina-chamber.jpg",
  },
  {
    name: "Tania Grant",
    title: "Owner",
    company: "TAG Studio",
    email: "taniagrantstudio@gmail.com",
    website: "https://www.tagvoiceover.com/",
    photo: "/images/people/ambassadors/tania-grant-medina-chamber-ambassador.jpg",
  },
  {
    name: "Don Hicks",
    title: "Area Vice President – Midwest Region",
    company: "Vensure",
    email: "don.hicks@vensure.com",
    website: null,
    photo: "/images/people/ambassadors/don-hicks-medina-chamber-ambassador.jpg",
  },
  {
    name: "Laurin Jeffers",
    title: "Events and Community Manager",
    company: "Foundry Social / High Voltage Karting",
    email: "laurinj@highvoltagekarting.com",
    website: "https://thefoundrysocial.com/",
    photo: "/images/people/ambassadors/a-smiling-woman-with-dark-brown-hair-and-a-beige-button-up-shirt-indoors-with-blurred-background-medina-chamber.jpg",
  },
  {
    name: "Danielle Litton",
    title: "MRO Midwest Sales Manager",
    company: "National Process Systems",
    email: "Danielle.Litton@National-Process.com",
    website: null,
    photo: "/images/people/ambassadors/medina-chamber-ambassador-08.jpg",
  },
  {
    name: "Claus Meyer",
    title: "Certified Financial Planner",
    company: "Raymond James",
    email: "claus.meyer@raymondjames.com",
    website: "https://www.raymondjames.com/clausmeyer",
    photo: "/images/people/ambassadors/portrait-of-a-smiling-man-in-a-business-suit-outdoors-with-trees-in-the-background-medina-chamber.jpg",
  },
  {
    name: "Cindy Phillips",
    title: "Vice President, Wealth Advisor",
    company: "Huntington Bank",
    email: "cindy.k.phillips@huntington.com",
    website: "https://www.huntington.com/",
    photo: "/images/people/ambassadors/a-woman-with-long-gray-hair-smiling-wearing-a-black-blazer-and-patterned-blouse-standing-in-front-of-a-brick-wall-medina-chamber.jpg",
  },
  {
    name: "Sam Pietrangelo",
    title: "Community Marketing Manager",
    company: "Armstrong",
    email: "spietrangelo@agoc.com",
    website: "https://armstrongonewire.com",
    photo: "/images/people/ambassadors/smiling-man-with-short-dark-hair-wearing-a-light-gray-collared-shirt-face-close-up-against-a-dark-cloudy-background-medina-chamber.jpg",
  },
  {
    name: "Tori Toth",
    title: "Walk Manager",
    company: "Alzheimer's Association",
    email: "tjtoth@alz.org",
    website: "https://www.alz.org",
    photo: "/images/people/ambassadors/tori-toth-medina-chamber-ambassador.jpeg",
  },
  {
    name: "Kimberly Valco",
    title: "Community Relations",
    company: "Western Reserve Masonic Community",
    email: "kvalco@ohiomasonichome.org",
    website: "https://wrmcoh.org",
    photo: "/images/people/ambassadors/medina-chamber-ambassador-13.jpg",
  },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Chamber Ambassadors — Greater Medina Chamber of Commerce",
    description:
      "Meet the Greater Medina Chamber of Commerce Ambassadors — volunteer member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber throughout Medina County.",
    url: "https://medinachamber.com/about/ambassadors",
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      member: [
        { "@type": "Person", name: "Kari Deeks", jobTitle: "Treasury Management Officer", worksFor: { "@type": "Organization", name: "First Federal of Lakewood" } },
        { "@type": "Person", name: "Brittney Esser", jobTitle: "Escrow Processor", worksFor: { "@type": "Organization", name: "Title Select" } },
        { "@type": "Person", name: "Tania Grant", jobTitle: "Owner", worksFor: { "@type": "Organization", name: "TAG Studio" } },
        { "@type": "Person", name: "Don Hicks", jobTitle: "Area Vice President – Midwest Region", worksFor: { "@type": "Organization", name: "Vensure" } },
        { "@type": "Person", name: "Laurin Jeffers", jobTitle: "Events and Community Manager", worksFor: { "@type": "Organization", name: "Foundry Social" } },
        { "@type": "Person", name: "Danielle Litton", jobTitle: "MRO Midwest Sales Manager", worksFor: { "@type": "Organization", name: "National Process Systems" } },
        { "@type": "Person", name: "Claus Meyer", jobTitle: "Certified Financial Planner", worksFor: { "@type": "Organization", name: "Raymond James" } },
        { "@type": "Person", name: "Cindy Phillips", jobTitle: "Vice President, Wealth Advisor", worksFor: { "@type": "Organization", name: "Huntington Bank" } },
        { "@type": "Person", name: "Sam Pietrangelo", jobTitle: "Community Marketing Manager", worksFor: { "@type": "Organization", name: "Armstrong" } },
        { "@type": "Person", name: "Tori Toth", jobTitle: "Walk Manager", worksFor: { "@type": "Organization", name: "Alzheimer's Association" } },
        { "@type": "Person", name: "Kimberly Valco", jobTitle: "Community Relations", worksFor: { "@type": "Organization", name: "Western Reserve Masonic Community" } },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
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

      {/* Ambassador grid */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">
          Meet the Ambassadors — {ambassadors.length} Members
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ambassadors.map((a) => (
            <figure
              key={a.name}
              className="overflow-hidden bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] m-0"
            >
              <div className="relative w-full aspect-[4/3]">
                <Image
                  src={a.photo}
                  alt={`${a.name}, Chamber Ambassador${a.company ? ` from ${a.company}` : ""}`}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <figcaption className="sr-only">
                {a.name}{a.title ? `, ${a.title}` : ""}{a.company ? ` at ${a.company}` : ""} — Greater Medina Chamber of Commerce Ambassador, Medina, Ohio
              </figcaption>
              <div className="p-5">
                <h3 className="text-body font-bold text-text-primary">{a.name}</h3>
                <p className="text-body-sm text-text-secondary mt-0.5">{a.title}</p>
                <p className="text-caption font-semibold text-cambridge mt-0.5">{a.company}</p>
                <div className="mt-3 flex flex-col gap-1">
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
                      {a.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                </div>
              </div>
            </figure>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="max-w-2xl">
          <h2 className="text-h2">Become an Ambassador</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Ambassadors are active chamber members who want to give back and
            expand their network. If you&apos;re a member and interested in
            volunteering, reach out to Stephanie Mueller.
          </p>
          <div className="mt-8">
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
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
    </>
  );
}

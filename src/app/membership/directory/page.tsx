import type { Metadata } from "next";
import Link from "next/link";
import { growthZone } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Member Directory",
  description:
    "Find local businesses in Medina County. Browse the Greater Medina Chamber of Commerce member directory by category, name, or location.",
  openGraph: {
    title: "Member Directory — Greater Medina Chamber of Commerce",
    description:
      "Find local businesses in Medina County. Browse by category, name, or location.",
  },
};

const categories = [
  { name: "Dining & Food", count: "40+" },
  { name: "Health & Wellness", count: "55+" },
  { name: "Professional Services", count: "80+" },
  { name: "Home & Garden", count: "35+" },
  { name: "Retail & Shopping", count: "45+" },
  { name: "Auto & Transportation", count: "20+" },
  { name: "Education & Childcare", count: "25+" },
  { name: "Real Estate", count: "30+" },
];

export default function DirectoryPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Member Directory</p>
        <h1 className="text-display">
          Find a Local
          <br />
          <span className="text-accent">Medina Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          From downtown restaurants to professional services across the county,
          our members are the businesses that make Medina thrive. Browse by
          category or search the full directory.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href={growthZone.directory}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center px-6 py-3
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Search the Full Directory →
          </a>
          <Link
            href="/membership/join"
            className="
              inline-flex items-center px-6 py-3
              bg-bg-tertiary hover:bg-border-primary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Get Your Business Listed
          </Link>
        </div>
      </section>

      {/* Category Grid */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-8">
          Browse by Category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <a
              key={cat.name}
              href={growthZone.directory}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary hover:shadow-[var(--shadow-md)]
                transition-all
              "
            >
              <p className="text-h4 font-bold group-hover:text-accent transition-colors">
                {cat.name}
              </p>
              <p className="text-caption mt-1">{cat.count} businesses</p>
            </a>
          ))}
        </div>
      </section>

      {/* Why Join */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want your business in the directory?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members are automatically listed in the directory with their
            business name, address, website, and category. It&apos;s one of the
            most visible benefits of membership — customers search here first.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Join the Chamber →
            </Link>
            <Link
              href="/membership/benefits"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See All Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

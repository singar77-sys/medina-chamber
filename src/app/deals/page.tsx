import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/lib/db";
import { getPublicDeals } from "@/lib/deals";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Member Deals & Savings · Greater Medina Chamber of Commerce",
  description:
    "Exclusive deals and offers from Greater Medina Chamber of Commerce members. Support local businesses and save.",
  alternates: { canonical: "/deals" },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DealsPage() {
  let deals: Awaited<ReturnType<typeof getPublicDeals>> = [];
  try {
    deals = await getPublicDeals(db);
  } catch (err) {
    // hot_deals (migration 0005) may not be applied yet — show the empty state, not a 500.
    console.error("[deals] load failed:", err);
  }

  return (
    <main>
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted downtown Medina car-show / storefronts backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-deals-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Membership</p>
            <h1 className="text-display">
              <span className="block">Member</span>
              <span className="block text-accent">Deals</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Exclusive offers from Greater Medina Chamber members. Support local — and save. Chamber
              members can post their own deal from the member portal.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-f89">
        {deals.length === 0 ? (
          <p className="text-body text-text-tertiary">No active deals right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-f21">
            {deals.map((d) => {
              const link = d.dealUrl ?? d.orgWebsite;
              return (
                <article
                  key={d.id}
                  className="bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] p-f21 flex flex-col"
                >
                  {d.discountLabel && (
                    <span className="text-caption font-bold text-accent">{d.discountLabel}</span>
                  )}
                  <h2 className="text-h4 text-text-primary mt-f3">{d.title}</h2>
                  <p className="text-body-sm text-text-tertiary mt-f3">{d.orgName}</p>
                  <p className="text-body-sm text-text-secondary mt-f8 leading-relaxed flex-1">
                    {d.description}
                  </p>
                  {d.redemptionInstructions && (
                    <p className="text-caption text-text-tertiary mt-f8">
                      <strong>How to redeem:</strong> {d.redemptionInstructions}
                    </p>
                  )}
                  {d.terms && <p className="text-caption text-text-tertiary mt-f5">{d.terms}</p>}
                  {d.endsAt && (
                    <p className="text-caption text-text-tertiary mt-f5">Valid through {formatDate(d.endsAt)}</p>
                  )}
                  {link && (
                    <a
                      href={`/go/deal/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body-sm font-semibold mt-f13 text-accent"
                    >
                      Visit {d.orgName} →
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

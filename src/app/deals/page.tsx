import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { db } from "@/lib/db";
import { getPublicDeals, type PublicDeal } from "@/lib/deals";

export const dynamic = "force-dynamic";

/**
 * One query per request, shared by generateMetadata and the page body.
 * hot_deals (migration 0005) may not be applied yet — an empty list keeps
 * the empty state on screen instead of a 500.
 */
const loadPublicDeals = cache(async (): Promise<PublicDeal[]> => {
  try {
    return await getPublicDeals(db);
  } catch (err) {
    console.error("[deals] load failed:", err);
    return [];
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const deals = await loadPublicDeals();
  return {
    title: "Member Deals & Savings",
    description:
      "Exclusive deals and offers from Greater Medina Chamber of Commerce members. Support local businesses and save.",
    alternates: { canonical: "/deals" },
    // No member has posted a Hot Deal yet. An empty page indexes as a dead
    // end, and the homepage Quick Links funnel visitors straight into it,
    // so keep it out of the index (still followed, for the onward links)
    // until it carries real offers. Computed, not hardcoded, so it flips
    // back on its own the moment the first deal goes live.
    ...(deals.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DealsPage() {
  const deals = await loadPublicDeals();

  return (
    <>
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
              Exclusive offers from Greater Medina Chamber members. Support local — and save. Members
              can post their own Hot Deal through GrowthZone.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden mx-auto max-w-7xl px-6 lg:px-8 pb-f89">
        <VesicaPiscisWatermark className="tp-vesica" />
        {deals.length === 0 ? (
          // Deals are member-posted, so this page empties and refills with
          // them. Send the visitor somewhere real rather than leaving them
          // on a dead end (the homepage Quick Links link straight here).
          <div className="max-w-2xl">
            <p className="text-h4 text-text-primary">No member deals posted right now.</p>
            <p className="text-body text-text-secondary mt-f13 leading-relaxed">
              Hot Deals come and go with the members who post them. While this
              page is quiet, three places worth a look:
            </p>
            <ul className="mt-f21 space-y-f13">
              <li className="text-body-sm text-text-secondary leading-relaxed">
                <Link
                  href="/membership/savings"
                  className="font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Member savings programs
                </Link>{" "}
                — the year-round discounts every member gets on health
                insurance, workers&apos; compensation, energy, HR, and recreation.
              </li>
              <li className="text-body-sm text-text-secondary leading-relaxed">
                <Link
                  href="/membership/directory"
                  className="font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  The member directory
                </Link>{" "}
                — every Greater Medina Chamber business, searchable by trade
                and by town.
              </li>
              <li className="text-body-sm text-text-secondary leading-relaxed">
                <Link
                  href="/membership/join"
                  className="font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Join the Chamber
                </Link>{" "}
                — members can post their own Hot Deal to this page.
              </li>
            </ul>
          </div>
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
    </>
  );
}

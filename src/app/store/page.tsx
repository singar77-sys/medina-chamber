import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { HalftoneField } from "@/components/effects/HalftoneField";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Chamber Store",
  description:
    "Purchase Greater Medina Chamber of Commerce services online, including Certificate of Origin documentation for import/export businesses. Secure checkout through the Chamber's GrowthZone store.",
  openGraph: {
    title: "Store | Greater Medina Chamber of Commerce",
    description:
      "Buy chamber services online — Certificate of Origin documentation and more.",
  },
  alternates: { canonical: "/store" },
};

// Checkout stays on GrowthZone (the live system of record) during launch —
// these link out rather than transacting on-site.
const STORE_URL = "https://business.medinachamber.com/store";

const products = [
  {
    name: "Certificate of Origin Fee",
    price: "$50.00",
    description:
      "Official documentation certifying where your goods were manufactured, for Medina County businesses involved in import and export. The Chamber authenticates and stamps your certificate.",
    note: "Complimentary for Visibility Plus and Community Investor members (non-freight forwarders) — see member benefits.",
    href: "https://business.medinachamber.com/store/StoreItemDetails?StoreItemId=23241&quantity=0",
  },
];

export default function StorePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Greater Medina Chamber of Commerce Store",
    url: "https://medinachamber.com/store",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name,
        description: p.description,
        offers: {
          "@type": "Offer",
          price: p.price.replace("$", ""),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          url: p.href,
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <PageHero
        overline="Chamber Store"
        titleTop="Chamber"
        titleAccent="Store"
        subtitle={
          <>
            Purchase Chamber services online. Checkout is handled securely
            through our GrowthZone member portal.
          </>
        }
        image="/images/photos/downtown-medina.jpg"
      />

      {/* Products */}
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
        <FadeIn>
          <h2 className="text-overline text-cambridge mb-f21">Available Now</h2>
          <div className="grid md:grid-cols-2 gap-f21">
            {products.map((p) => (
              <div
                key={p.name}
                className="flex flex-col p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <div className="flex items-start justify-between gap-f13">
                  <h3 className="text-h3">{p.name}</h3>
                  <span className="shrink-0 text-h3 text-cambridge font-bold tabular-nums">
                    {p.price}
                  </span>
                </div>
                <p className="text-body text-text-secondary leading-relaxed mt-f13 flex-1">
                  {p.description}
                </p>
                {p.note && (
                  <p className="text-body-sm text-text-tertiary leading-relaxed mt-f13">
                    {p.note}
                  </p>
                )}
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    mt-f21 inline-flex items-center justify-center px-f21 py-f13
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Purchase on GrowthZone →
                </a>
              </div>
            ))}
          </div>

          <p className="text-body-sm text-text-tertiary mt-f21">
            Looking for something else?{" "}
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              Visit the full Chamber store →
            </a>
          </p>
        </FadeIn>
      </section>

      {/* Note about checkout — dots per the Band Book (utility band) */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <HalftoneField />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl">
              <h2 className="text-h2">How checkout works</h2>
              <p className="text-body-lg text-text-secondary mt-f13 leading-relaxed">
                Payments are processed securely through the Chamber&apos;s
                GrowthZone portal. When you select a product, you&apos;ll be
                taken to GrowthZone to complete your purchase. Questions about an
                order?{" "}
                <Link
                  href="/about/contact"
                  className="font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Contact the Chamber
                </Link>
                .
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}

import Image from "next/image";

/**
 * DirectoryHero — the directory page's signature full-bleed ghosted hero.
 *
 * Headline + SEO/trust supporting copy only. The search field lives in the
 * Browse band below (DirectorySearch) so it sits alongside the browsing tools
 * rather than orphaned at the bottom of the photo.
 */
export function DirectoryHero() {
  return (
    <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem] flex items-end">
      {/* Ghosted downtown Medina backdrop */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
      >
        <Image
          src="/images/photos/downtown-medina-2.jpg"
          alt=""
          fill
          priority
          className="object-cover opacity-[0.33]"
          sizes="100vw"
          quality={60}
        />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 w-full">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Member Directory</p>
          <h1 className="text-display">
            <span className="block">Find a Local</span>
            <span className="block text-accent">Medina Business</span>
          </h1>
          {/* Supporting copy: the hero's SEO and trust paragraph. Names the
              county, real member towns, the truthful 500+ count, and the
              Chamber-member trust signal. */}
          <p className="text-body-lg text-text-secondary mt-f21 max-w-2xl leading-relaxed">
            The Greater Medina Chamber of Commerce directory connects you with{" "}
            <span className="font-bold text-text-primary">500+ member businesses</span>{" "}
            across Medina County, from Medina, Brunswick, and Wadsworth to Lodi,
            Seville, and Valley City. Every listing is a Chamber member: vetted
            local companies in every trade, from contractors and restaurants to
            insurance, health care, and manufacturing. Describe what you need,
            and we&apos;ll find who does it.
          </p>
        </div>
      </div>
    </section>
  );
}

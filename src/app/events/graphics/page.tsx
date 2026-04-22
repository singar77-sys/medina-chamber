import type { Metadata } from "next";
import Link from "next/link";
import {
  EVENT_GRAPHICS,
  GRAPHIC_DIMS,
  GraphicFrame,
  getEventGraphicRenderer,
  type GraphicMode,
} from "@/components/events/graphics/EventGraphics";
import { getUpcomingEvents } from "@/data/events";

export const metadata: Metadata = {
  title: "Event Graphics",
  description:
    "Social media graphic templates for Greater Medina Chamber events — Networking WOW, Safety Council, Chamber Chat, Member Meeting, Golf Outing, and the Athena Awards. Designed for Instagram feed, square, and story sizes.",
  alternates: { canonical: "/events/graphics" },
  robots: { index: false, follow: false }, // internal tool / design reference
};

/** Display widths per mode for the preview grid. Heights follow aspect ratio. */
const DISPLAY_WIDTHS: Record<GraphicMode, number> = {
  social: 520,   // → 273 tall
  square: 320,   // → 320 tall
  story: 220,    // → 391 tall
};

const MODE_LABELS: Record<GraphicMode, string> = {
  social: "Social · 1200×630",
  square: "Square · 1080×1080",
  story:  "Story · 1080×1920",
};

const MODES: GraphicMode[] = ["social", "square", "story"];

export default function EventGraphicsPage() {
  // For graphics that support an event-info plinth (currently only
  // Networking WOW), bind the preview to the next scheduled instance so
  // the showcase reflects what would actually post — date/time/registration.
  // Generic templates render unchanged.
  const upcoming = getUpcomingEvents();
  const boundComponents: Record<string, React.ComponentType<{ mode?: GraphicMode }>> = {};
  const bind = (key: string, slugPrefix: string) => {
    const next = upcoming.find((e) => e.slug.startsWith(slugPrefix));
    if (!next) return;
    const Bound = getEventGraphicRenderer(next);
    if (Bound) boundComponents[key] = Bound;
  };
  bind("networking-wow", "networking-wow");
  bind("safety-council", "safety-council");
  bind("chamber-chat", "chamber-chat");
  bind("business-brew", "business-brew");
  bind("eggs-expertise", "eggs-expertise");

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">

      {/* ── Hero ── */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Events · Graphics</p>
        <h1 className="text-display">
          Event Graphics
          <br />
          <span className="text-accent">System</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Brand-consistent social graphics for the Chamber&apos;s recurring and signature events.
          Six designs, three sizes each — feed, square, and story. Designed as live React
          components so copy, dates, and imagery stay accurate automatically.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-caption text-text-tertiary">
          <span className="px-3 py-1 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]">
            {EVENT_GRAPHICS.length} designs
          </span>
          <span className="px-3 py-1 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]">
            {MODES.length} sizes each
          </span>
          <span className="px-3 py-1 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]">
            BN Bergen · Oxford / Cambridge / Coquelicot / Emerald
          </span>
        </div>
      </section>

      {/* ── Graphic grid ── */}
      <section className="mt-20 space-y-20">
        {EVENT_GRAPHICS.map((g, i) => {
          const Component = boundComponents[g.key] ?? g.Component;
          return (
          <article key={g.key} className="border-t border-border-secondary pt-10">

            {/* Header row */}
            <header className="flex items-end justify-between mb-6 gap-6 flex-wrap">
              <div>
                <p className="text-caption text-text-tertiary font-medium">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="text-h2 mt-1">{g.title}</h2>
                {boundComponents[g.key] && (
                  <p className="text-caption text-cambridge mt-1 font-medium">
                    Preview bound to next scheduled instance
                  </p>
                )}
              </div>
              <p className="text-caption text-text-tertiary font-mono">
                {g.key}
              </p>
            </header>

            {/* Three-mode preview row — wraps on narrow screens */}
            <div className="flex flex-wrap gap-8 items-start">
              {MODES.map((mode) => {
                const width = DISPLAY_WIDTHS[mode];
                const { w, h } = GRAPHIC_DIMS[mode];
                const height = Math.round((width * h) / w);

                return (
                  <figure key={mode} className="flex flex-col gap-3">
                    <div
                      className="
                        rounded-[var(--radius-md)]
                        overflow-hidden
                        shadow-[var(--shadow-md)]
                        border border-border-secondary
                        bg-bg-secondary
                      "
                      style={{ width, height }}
                    >
                      <GraphicFrame mode={mode} displayWidth={width}>
                        <Component mode={mode} />
                      </GraphicFrame>
                    </div>
                    <figcaption className="text-caption text-text-tertiary text-center font-medium">
                      {MODE_LABELS[mode]}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </article>
          );
        })}
      </section>

      {/* ── Usage notes ── */}
      <section className="mt-24 p-10 lg:p-12 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <h2 className="text-h3">How to use these</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div>
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider">1. Preview</p>
            <p className="text-body-sm text-text-secondary mt-2">
              Open this page and scroll through. Every design renders at its true pixel
              size inside a scaled preview — what you see is what gets posted.
            </p>
          </div>
          <div>
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider">2. Capture</p>
            <p className="text-body-sm text-text-secondary mt-2">
              Right-click any preview → &ldquo;Inspect&rdquo; → screenshot the inner
              graphic at 1× scale for pixel-perfect export. A dedicated export route
              can be added later.
            </p>
          </div>
          <div>
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider">3. Ship</p>
            <p className="text-body-sm text-text-secondary mt-2">
              Post to the Chamber Instagram, Facebook, and LinkedIn. Story size works
              as a phone-wallpaper drop for member engagement too.
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/events"
            className="
              inline-flex items-center px-5 py-2.5
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            ← Back to Events
          </Link>
        </div>
      </section>
    </div>
  );
}

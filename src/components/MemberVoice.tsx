import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { BrandShaderBackground } from "@/components/effects/BrandShaderBackground";

/**
 * MemberVoice — typographic pull quote as architectural moment.
 *
 * Server Component. No photo — the quote itself is the face. Massive
 * cambridge open-quote as visual anchor, attribution in the lower-right
 * corner as signature, supporting stat chip + link to more stories.
 */
export function MemberVoice() {
  return (
    <section className="mv-section relative bg-bg-primary border-y border-border-secondary py-20 lg:py-28 overflow-hidden">
      {/* Liquid-chrome shader wallpaper — brand-tinted WebGL backdrop
          that flows with time and reacts to cursor. Sits behind the
          quote with pointer-events: none so it never interferes with
          selection or reading. Replaces the old static cambridge
          radial wash with something living. */}
      <BrandShaderBackground className="mv-shader-bg" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        <FadeIn>
          <p className="text-overline text-cambridge mb-8 tracking-[0.2em]">
            Member Voice
          </p>

          <blockquote className="mv-quote">
            <span className="mv-quote__mark" aria-hidden="true">
              &ldquo;
            </span>
            <span className="mv-quote__body">
              The Chamber helped us build relationships that turned into
              customers, partnerships, and lasting opportunities.
              <br />
              It&apos;s been <span className="text-accent">invaluable</span> to
              our growth.
            </span>
          </blockquote>
        </FadeIn>

        <FadeIn delay={150}>
          <div className="mt-10 lg:mt-14 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-caption text-text-tertiary uppercase tracking-[0.18em] font-bold">
                Attribution
              </p>
              <p className="text-body-sm text-text-primary mt-2 font-bold">
                Dan Calvin
                <span className="text-text-tertiary font-normal">
                  {" · "}Critchfield, Critchfield &amp; Johnston, Ltd.
                </span>
              </p>
            </div>

            <Link
              href="/membership/directory"
              className="
                inline-flex items-center gap-2
                text-body-sm font-bold text-cambridge
                hover:text-cambridge/80 transition-colors
                justify-self-start lg:justify-self-end
              "
            >
              Meet the members
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

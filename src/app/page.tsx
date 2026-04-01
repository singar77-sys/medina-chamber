import Image from "next/image";

/* ─── Swatch Component ─────────────────────────────────── */

function Swatch({
  name,
  hex,
  cssVar,
}: {
  name: string;
  hex: string;
  cssVar: string;
}) {
  return (
    <div className="flex flex-col">
      <div
        className="w-full aspect-[3/2] rounded-[var(--radius-md)] border border-border-primary"
        style={{ backgroundColor: hex }}
      />
      <p className="mt-2 font-bold text-body-sm">{name}</p>
      <p className="text-caption font-regular">{hex}</p>
      <p className="text-caption font-regular opacity-60">{cssVar}</p>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────── */

export default function FoundationPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24 space-y-24">
      {/* ─── Hero / Intro ─────────────────────────────── */}
      <section>
        <p className="text-overline text-cambridge mb-4">Foundation Specimen</p>
        <h1 className="text-display max-w-3xl">
          Medina Chamber
          <br />
          <span className="text-accent">Design System</span>
        </h1>
        <p className="text-body-lg text-text-secondary max-w-2xl mt-6">
          Typography, color palette, and foundational tokens for the new
          medinachamber.com — built on Next.js 16, BN Bergen, and a four-color
          brand palette rooted in Oxford Blue.
        </p>
      </section>

      {/* ─── Typography Scale ─────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">Typography Scale</h2>

        <div className="space-y-8">
          <div>
            <p className="text-caption mb-2">Display — Hero headlines</p>
            <p className="text-display">The Square</p>
          </div>

          <div>
            <p className="text-caption mb-2">H1 — Page titles</p>
            <h1>Connecting Medina Since 1938</h1>
          </div>

          <div>
            <p className="text-caption mb-2">H2 — Section headers</p>
            <h2>Membership Benefits</h2>
          </div>

          <div>
            <p className="text-caption mb-2">H3 — Subsection</p>
            <h3>Chamber Programs &amp; Events</h3>
          </div>

          <div>
            <p className="text-caption mb-2">H4 — Card titles</p>
            <h4>Annual Golf Outing</h4>
          </div>

          <div className="grid md:grid-cols-2 gap-8 pt-4 border-t border-border-secondary">
            <div>
              <p className="text-caption mb-2">Body Large (18px)</p>
              <p className="text-body-lg text-text-secondary">
                The Greater Medina Chamber of Commerce is the heartbeat of
                business in Medina County. We connect entrepreneurs, established
                businesses, and community leaders around a shared vision for growth.
              </p>
            </div>
            <div>
              <p className="text-caption mb-2">Body (16px)</p>
              <p className="text-body text-text-secondary">
                Whether you&apos;re a sole proprietor or a company of five hundred,
                the Chamber provides the introductions, resources, and advocacy
                you need to thrive in Northeast Ohio.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-4 border-t border-border-secondary">
            <div>
              <p className="text-caption mb-2">Body Small (14px)</p>
              <p className="text-body-sm text-text-secondary">
                Events are held at the Chamber building on North Court Street,
                right on the historic Medina Square.
              </p>
            </div>
            <div>
              <p className="text-caption mb-2">Caption (13px)</p>
              <p className="text-caption">
                Last updated March 2026 &bull; Greater Medina Chamber of Commerce
              </p>
            </div>
            <div>
              <p className="text-caption mb-2">Overline (12px)</p>
              <p className="text-overline">Upcoming Events</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Font Weights ─────────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">BN Bergen Weights</h2>
        <div className="space-y-4">
          <p className="text-h2 font-light">
            Light 300 — Medina Means Business
          </p>
          <p className="text-h2 font-regular">
            Regular 400 — Medina Means Business
          </p>
          <p className="text-h2 font-bold">
            Bold 700 — Medina Means Business
          </p>
        </div>
      </section>

      {/* ─── Color Palette ────────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">Brand Palette</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Swatch
            name="Oxford Blue"
            hex="#0C1B33"
            cssVar="--oxford-blue"
          />
          <Swatch
            name="Cambridge"
            hex="#83BCA9"
            cssVar="--cambridge"
          />
          <Swatch
            name="Coquelicot"
            hex="#FF4000"
            cssVar="--coquelicot"
          />
          <Swatch
            name="Emerald"
            hex="#005450"
            cssVar="--emerald"
          />
        </div>
      </section>

      {/* ─── Semantic Colors ──────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">
          Semantic Tokens (theme-aware)
        </h2>
        <p className="text-body text-text-secondary mb-8">
          Toggle light/dark mode to see these adapt.
        </p>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Backgrounds */}
          <div>
            <h3 className="text-h4 mb-4">Backgrounds</h3>
            <div className="space-y-3">
              {[
                { label: "bg-primary", cls: "bg-bg-primary" },
                { label: "bg-secondary", cls: "bg-bg-secondary" },
                { label: "bg-tertiary", cls: "bg-bg-tertiary" },
                { label: "bg-inverse", cls: "bg-bg-inverse" },
                { label: "accent-subtle", cls: "bg-accent-subtle" },
                { label: "surface-cambridge", cls: "bg-surface-cambridge" },
                { label: "surface-emerald", cls: "bg-surface-emerald" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-4">
                  <div
                    className={`w-16 h-10 rounded-[var(--radius-sm)] border border-border-primary ${cls}`}
                  />
                  <code className="text-body-sm text-text-secondary">
                    {label}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Text colors */}
          <div>
            <h3 className="text-h4 mb-4">Text</h3>
            <div className="space-y-3">
              <p className="text-body text-text-primary font-bold">
                text-primary — Headlines and body
              </p>
              <p className="text-body text-text-secondary">
                text-secondary — Supporting copy
              </p>
              <p className="text-body text-text-tertiary">
                text-tertiary — Captions and meta
              </p>
              <p className="text-body text-text-accent font-bold">
                text-accent — Links and emphasis
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Component Samples ────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">Component Tokens</h2>

        <div className="space-y-8">
          {/* Buttons */}
          <div>
            <h3 className="text-h4 mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-4">
              <a
                href="#"
                className="
                  inline-flex items-center px-6 py-3
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Join Now &rarr;
              </a>
              <a
                href="#"
                className="
                  inline-flex items-center px-6 py-3
                  bg-bg-tertiary hover:bg-border-primary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Learn More
              </a>
              <a
                href="#"
                className="
                  inline-flex items-center px-6 py-3
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                View Events
              </a>
            </div>
          </div>

          {/* Cards */}
          <div>
            <h3 className="text-h4 mb-4">Card</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "Networking Events",
                  desc: "Monthly mixers, Chamber Chats, and Networking WOW bring business owners together.",
                  tag: "Events",
                },
                {
                  title: "Compass Program",
                  desc: "Mentorship for emerging leaders paired with established Medina business owners.",
                  tag: "Programs",
                },
                {
                  title: "Athena Awards",
                  desc: "Honoring women who demonstrate excellence in leadership and community service.",
                  tag: "Awards",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="
                    p-6 rounded-[var(--radius-lg)]
                    bg-bg-secondary border border-border-secondary
                    hover:border-border-primary hover:shadow-[var(--shadow-md)]
                    transition-all
                  "
                >
                  <span className="text-overline text-cambridge">
                    {card.tag}
                  </span>
                  <h4 className="text-h4 mt-2 mb-3">{card.title}</h4>
                  <p className="text-body-sm text-text-secondary">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shadows + Radius */}
          <div>
            <h3 className="text-h4 mb-4">Elevation &amp; Radius</h3>
            <div className="flex flex-wrap gap-6">
              {[
                { label: "shadow-sm", shadow: "var(--shadow-sm)" },
                { label: "shadow-md", shadow: "var(--shadow-md)" },
                { label: "shadow-lg", shadow: "var(--shadow-lg)" },
              ].map(({ label, shadow }) => (
                <div
                  key={label}
                  className="
                    w-32 h-24 flex items-center justify-center
                    bg-bg-primary border border-border-secondary
                    rounded-[var(--radius-md)]
                  "
                  style={{ boxShadow: shadow }}
                >
                  <code className="text-caption">{label}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Photo Grid ───────────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">Photography</h2>
        <p className="text-body text-text-secondary mb-8 max-w-2xl">
          Real Medina. No stock photos. The town square, the gazebo, downtown
          storefronts — this is the brand&apos;s visual bedrock.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { src: "/images/photos/medina-square-aerial-spring.png", alt: "Medina Square aerial in spring" },
            { src: "/images/photos/gazebo-night-flag.png", alt: "Gazebo at night with American flag" },
            { src: "/images/photos/downtown-medina.jpg", alt: "Downtown Medina storefronts" },
            { src: "/images/photos/courthouse-medina.jpg", alt: "Medina courthouse" },
            { src: "/images/photos/downtown-medina-2.jpg", alt: "Downtown Medina" },
            { src: "/images/photos/gazebo-daytime-trees.png", alt: "Gazebo in daytime" },
          ].map((photo) => (
            <div
              key={photo.src}
              className="relative aspect-[4/3] rounded-[var(--radius-md)] overflow-hidden"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ─── Logo Marks ───────────────────────────────── */}
      <section>
        <h2 className="text-overline text-cambridge mb-8">Logo System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex items-center justify-center p-8 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
            <Image
              src="/images/logos/logo-full-blue.png"
              alt="Full logo blue"
              width={140}
              height={140}
              className="h-28 w-auto"
            />
          </div>
          <div className="flex items-center justify-center p-8 bg-oxford rounded-[var(--radius-lg)]">
            <Image
              src="/images/logos/logo-full-white.png"
              alt="Full logo white"
              width={140}
              height={140}
              className="h-28 w-auto"
            />
          </div>
          <div className="flex items-center justify-center p-8 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
            <Image
              src="/images/logos/icon-blue.png"
              alt="Icon mark blue"
              width={80}
              height={80}
              className="h-20 w-auto"
            />
          </div>
          <div className="flex items-center justify-center p-8 bg-cambridge rounded-[var(--radius-lg)]">
            <Image
              src="/images/logos/stamp-teal.png"
              alt="Stamp seal teal"
              width={80}
              height={80}
              className="h-20 w-auto"
            />
          </div>
        </div>
      </section>

      {/* ─── Architecture Summary ─────────────────────── */}
      <section className="pb-8">
        <h2 className="text-overline text-cambridge mb-8">Stack</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-h4 mb-3">Tech</h3>
            <ul className="text-body-sm text-text-secondary space-y-2">
              <li>Next.js 16 &mdash; App Router</li>
              <li>Tailwind CSS v4 &mdash; CSS-first config</li>
              <li>Vercel deployment</li>
              <li>GrowthZone for member portal</li>
            </ul>
          </div>
          <div>
            <h3 className="text-h4 mb-3">Design Decisions</h3>
            <ul className="text-body-sm text-text-secondary space-y-2">
              <li>BN Bergen &mdash; geometric sans, matches the logo type</li>
              <li>Oxford Blue dark mode &mdash; the brand IS the dark</li>
              <li>Coquelicot accent &mdash; pops against both themes</li>
              <li>Real photography over stock &mdash; Medina sells itself</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

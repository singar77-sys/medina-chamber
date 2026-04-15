import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "The Greater Medina Chamber of Commerce is committed to digital accessibility. Our website targets WCAG 2.1 Level AA, the standard referenced by the Americans with Disabilities Act.",
  openGraph: {
    title: "Accessibility Statement — Greater Medina Chamber of Commerce",
    description:
      "Our commitment to making medinachamber.com accessible to everyone, including people with disabilities.",
  },
  alternates: { canonical: "/accessibility" },
};

const whatWeveDone = [
  {
    title: "Keyboard navigation",
    body: "Every interactive element — links, buttons, forms, the ChamberBot chat widget, the mobile menu, search overlay — works with keyboard alone. A skip-to-main-content link is the first focusable element on every page.",
  },
  {
    title: "Screen reader support",
    body: "Semantic HTML5 landmarks (<main>, <nav>, <header>, <footer>), descriptive alt text on all images, aria-labels on icon-only buttons, and a proper heading hierarchy so assistive technology can read the page structure.",
  },
  {
    title: "Color contrast",
    body: "All body text meets the WCAG 2.1 AA contrast ratio of 4.5:1 or better, verified across every page in both light and dark modes using axe-core. The accent call-to-action button was darkened specifically to pass contrast on white text.",
  },
  {
    title: "Dark mode parity",
    body: "Every contrast, focus, and readability standard applies in both light and dark themes. We audited each page in both modes and fixed inherited dark-mode regressions — no invisible text, no broken hierarchies.",
  },
  {
    title: "Focus indicators",
    body: "Clear, visible focus rings on all interactive elements so keyboard users always know where they are. Focus indicators meet contrast requirements against their backgrounds.",
  },
  {
    title: "Reduced motion",
    body: "The site respects your operating system's prefers-reduced-motion setting. Floating animations, fade-ins, the ChamberBot robot, loading spinners, and the hero entrance all honor reduced-motion preferences.",
  },
  {
    title: "Responsive reflow",
    body: "Content reflows cleanly down to a 320-pixel viewport without requiring horizontal scrolling (WCAG 1.4.10). The site works at 200 percent text zoom and on narrow mobile screens.",
  },
  {
    title: "Forms",
    body: "Every form input — membership application, contact form, search — has an associated label, clear error messages, and visible required-field indicators. Forms are rate-limited and validate before submission.",
  },
  {
    title: "ChamberBot chat",
    body: "The AI chat interface is fully keyboard-accessible with an aria-label, readable status indicators (idle, thinking, responding), and streaming responses that screen readers can follow.",
  },
];

const knownLimitations = [
  {
    title: "Third-party embedded content",
    body: "Event registration pages hosted on our GrowthZone platform, external PDFs, and some embedded media from partners may not fully meet WCAG 2.1 AA. We are working with these providers and will link alternatives where possible.",
  },
  {
    title: "Legacy content",
    body: "Historical photos in our hall of fame and event archives may carry alt text less descriptive than we would like. We are re-reviewing older content as we touch each page.",
  },
  {
    title: "AI-generated responses",
    body: "ChamberBot answers are generated in real time by an AI language model. While the interface is accessible, the content of individual responses may occasionally use phrasing we would refine — let us know if a specific answer is unclear.",
  },
];

export default function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Our Commitment</p>
        <h1 className="text-display">Accessibility Statement</h1>
        <p className="text-body-lg text-text-secondary mt-6 leading-relaxed">
          The Greater Medina Chamber of Commerce is committed to making our
          website and programs accessible to everyone, including people with
          disabilities. The businesses we champion and the community we serve
          include people of all abilities — accessibility is core to how we
          work, not an afterthought.
        </p>
      </section>

      {/* Conformance status */}
      <section className="mt-16 p-8 lg:p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <h2 className="text-h3">Conformance Status</h2>
        <p className="text-body text-text-secondary mt-4 leading-relaxed">
          This website aims to conform to the{" "}
          <a
            href="https://www.w3.org/TR/WCAG21/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
          >
            Web Content Accessibility Guidelines (WCAG) 2.1 Level AA
          </a>
          , the international standard referenced by the Americans with
          Disabilities Act (ADA) and Section 508 of the Rehabilitation Act.
        </p>
        <p className="text-body-sm text-text-tertiary mt-4">
          <span className="font-bold text-text-secondary">Last reviewed:</span>{" "}
          April 14, 2026
        </p>
      </section>

      {/* What we've done */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">What We&apos;ve Done</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {whatWeveDone.map((item) => (
            <div
              key={item.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h3 className="text-h4 mb-3">{item.title}</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Known limitations */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Known Limitations</h2>
        <p className="text-body text-text-secondary mb-6 max-w-3xl">
          We are continuously improving. A few areas we are still working on:
        </p>
        <div className="space-y-4">
          {knownLimitations.map((item) => (
            <div
              key={item.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h3 className="text-h4 mb-2">{item.title}</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Report an issue */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-overline text-cambridge mb-3">Feedback</p>
            <h2 className="text-h2">Report an Accessibility Issue</h2>
            <p className="text-body-lg text-text-secondary mt-4 leading-relaxed">
              If you run into a barrier on our website or have a suggestion to
              help us improve, please tell us. We take accessibility feedback
              seriously and will respond within two business days.
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-body text-text-secondary">
                <span className="font-bold text-text-primary">Email:</span>{" "}
                <a
                  href="mailto:office@medinaohchamber.com?subject=Website%20Accessibility%20Feedback"
                  className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
                >
                  office@medinaohchamber.com
                </a>
              </p>
              <p className="text-body text-text-secondary">
                <span className="font-bold text-text-primary">Phone:</span>{" "}
                <a
                  href="tel:+13307238773"
                  className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
                >
                  (330) 723-8773
                </a>
              </p>
              <p className="text-body text-text-secondary">
                <span className="font-bold text-text-primary">Office:</span> 139
                N. Court Street, Suite A, Medina, OH 44256
              </p>
            </div>
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
              Use the contact form →
            </Link>
          </div>
        </div>
      </section>

      {/* Standards reference */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-6">Standards Referenced</h2>
        <ul className="space-y-3 text-body text-text-secondary max-w-3xl">
          <li>
            <a
              href="https://www.w3.org/TR/WCAG21/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
            >
              Web Content Accessibility Guidelines (WCAG) 2.1
            </a>{" "}
            — published by the World Wide Web Consortium (W3C)
          </li>
          <li>
            <a
              href="https://www.ada.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
            >
              Americans with Disabilities Act (ADA)
            </a>{" "}
            — U.S. federal civil rights law
          </li>
          <li>
            <a
              href="https://www.section508.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
            >
              Section 508 of the Rehabilitation Act
            </a>{" "}
            — U.S. federal accessibility standard
          </li>
        </ul>
      </section>
    </div>
  );
}

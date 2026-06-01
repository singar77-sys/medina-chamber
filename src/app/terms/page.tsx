import type { Metadata } from "next";
import Link from "next/link";
import { chamberOffice } from "@/data/staff";
import { mailto } from "@/lib/format";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms governing use of the Greater Medina Chamber of Commerce website, including the AI assistant, member directory, and all site content.",
  openGraph: {
    title: "Terms of Use | Greater Medina Chamber of Commerce",
    description:
      "Terms governing use of medinachamber.com, the AI assistant, and the member directory.",
  },
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 lg:px-8 py-f55 lg:py-f89">
      <header className="mb-f34">
        <p className="text-overline text-cambridge mb-f13">Legal</p>
        <h1 className="text-display">Terms of Use</h1>
        <p className="text-body-lg text-text-secondary mt-f21">
          Plain English. Effective April 2026.
        </p>
      </header>

      <section className="prose prose-lg max-w-none text-text-primary space-y-f34">

        <div>
          <h2 className="text-h2 mb-f13">Who this covers</h2>
          <p className="text-body text-text-secondary">
            These terms apply to anyone who uses medinachamber.com (the
            &ldquo;Site&rdquo;), operated by the Greater Medina Chamber of
            Commerce (&ldquo;Chamber,&rdquo; &ldquo;we,&rdquo;
            &ldquo;us&rdquo;). By using the Site you agree to these terms. If
            you don&apos;t agree, don&apos;t use the Site.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">AI assistant (ChamberBot)</h2>
          <p className="text-body text-text-secondary">
            ChamberBot is an AI language model. Its responses are generated
            automatically and may be incomplete, outdated, or incorrect.
            Nothing ChamberBot says constitutes legal, financial, tax, or
            professional advice. The Chamber does not guarantee the accuracy
            of any AI-generated response.
          </p>
          <p className="text-body text-text-secondary mt-f8">
            When ChamberBot mentions a specific member business, hours,
            services, pricing, contact details, that information comes from
            the member&apos;s public directory listing. Verify directly with
            the business before acting on it. The Chamber is not responsible
            for errors in member-supplied information.
          </p>
          <p className="text-body text-text-secondary mt-f8">
            Conversations with ChamberBot are stored for 90 days for quality
            improvement. See our{" "}
            <Link href="/privacy" className="text-cambridge hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Member directory</h2>
          <p className="text-body text-text-secondary">
            The directory displays business information that members have
            chosen to publish through the Chamber&apos;s GrowthZone platform.
            The Chamber makes reasonable efforts to keep listings accurate but
            does not verify every detail. Members are responsible for keeping
            their own listings current. The Chamber is not liable for errors
            in directory content.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Site content</h2>
          <p className="text-body text-text-secondary">
            All content on this Site, text, graphics, logos, photographs, 
            is the property of the Greater Medina Chamber of Commerce or its
            members and partners, and is protected by copyright. You may
            share links to pages on this Site. You may not reproduce, copy,
            or distribute Site content for commercial purposes without written
            permission.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Membership</h2>
          <p className="text-body text-text-secondary">
            Membership pricing, benefits, and terms are established by the
            Chamber and communicated during the application and renewal
            process. Published pricing on this Site reflects current rates but
            may be updated; contact the Chamber to confirm current pricing
            before applying. Membership is subject to the Chamber&apos;s
            bylaws and board policies.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">External links</h2>
          <p className="text-body text-text-secondary">
            The Site links to third-party websites including GrowthZone,
            member business sites, and government resources. The Chamber does
            not control and is not responsible for the content, privacy
            practices, or accuracy of any external site.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Limitation of liability</h2>
          <p className="text-body text-text-secondary">
            To the fullest extent permitted by Ohio law, the Chamber is not
            liable for any direct, indirect, incidental, or consequential
            damages arising from your use of this Site, reliance on
            AI-generated content, errors in the member directory, or
            inability to access the Site. The Site is provided &ldquo;as
            is&rdquo; without warranties of any kind.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Governing law</h2>
          <p className="text-body text-text-secondary">
            These terms are governed by the laws of the State of Ohio. Any
            disputes arising from use of this Site shall be resolved in the
            courts of Medina County, Ohio.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Changes</h2>
          <p className="text-body text-text-secondary">
            We may update these terms. Material changes will be reflected in
            the &ldquo;Effective&rdquo; date above. Continued use of the Site
            after an update constitutes acceptance of the revised terms.
          </p>
        </div>

        <div>
          <h2 className="text-h2 mb-f13">Contact</h2>
          <p className="text-body text-text-secondary">
            Greater Medina Chamber of Commerce · 139 N. Court Street, Suite
            A, Medina, OH 44256 · (330) 723-8773 ·{" "}
            <a
              href={mailto(chamberOffice.email)}
              className="text-cambridge hover:underline"
            >{chamberOffice.email}</a>
          </p>
        </div>

      </section>

      <footer className="mt-f55 pt-f34 border-t border-border-secondary flex gap-f21">
        <Link href="/privacy" className="text-body-sm text-cambridge hover:underline font-bold">
          Privacy Policy
        </Link>
        <Link href="/" className="text-body-sm text-cambridge hover:underline font-bold">
          ← Back to home
        </Link>
      </footer>
    </article>
  );
}

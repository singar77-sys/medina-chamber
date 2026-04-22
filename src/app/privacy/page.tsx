import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How the Greater Medina Chamber of Commerce website handles information — what we collect, how long we keep it, and how to request deletion.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 lg:px-8 py-16 lg:py-24">
      <header className="mb-10">
        <p className="text-overline text-cambridge mb-4">About</p>
        <h1 className="text-display">Privacy</h1>
        <p className="text-body-lg text-text-secondary mt-6">
          Plain English, no lawyer-speak. How medinachamber.com handles information.
          Updated April 2026.
        </p>
      </header>

      <section className="prose prose-lg max-w-none text-text-primary">
        <h2 className="text-h2 mt-12 mb-4">The short version</h2>
        <ul className="space-y-2 text-body text-text-secondary">
          <li>We don&apos;t sell your data. There&apos;s no advertising network on this site.</li>
          <li>We don&apos;t use third-party tracking cookies. Site traffic is measured through Vercel&apos;s privacy-respecting analytics (no cookies, no cross-site tracking).</li>
          <li>When you chat with ChamberBot, your conversation is kept for 90 days so we can improve how it answers questions. It&apos;s not tied to your name unless you volunteer that information.</li>
          <li>When you fill out a contact or membership form, we use your info to reply to you and nothing else.</li>
          <li>You can ask us to delete anything we have about you. Email{" "}
            <a href="mailto:office@medinaohchamber.com" className="text-cambridge hover:underline">
              office@medinaohchamber.com
            </a>.</li>
        </ul>

        <h2 className="text-h2 mt-12 mb-4">What we collect and why</h2>

        <h3 className="text-h3 mt-8 mb-3">ChamberBot conversations</h3>
        <p className="text-body text-text-secondary">
          The AI assistant on this site (ChamberBot) stores your conversation
          so the bot can remember what you asked earlier in the same
          conversation, and so we can see the kinds of questions visitors ask.
          For each chat we store:
        </p>
        <ul className="space-y-2 text-body text-text-secondary mt-3">
          <li>A randomly generated session ID (no name or login required).</li>
          <li>The text of your messages and the bot&apos;s replies.</li>
          <li>Your IP address, for abuse prevention only.</li>
          <li>A short topic label the bot assigns to your question (&quot;membership&quot;, &quot;events&quot;, etc.) so we can see what&apos;s popular.</li>
        </ul>
        <p className="text-body text-text-secondary mt-3">
          Conversations are kept for <strong>90 days</strong>, then automatically
          deleted. If you share your name or email in the chat — for example
          when asking to talk to a team member — that information sits in the
          conversation log with the same 90-day retention.
        </p>

        <h3 className="text-h3 mt-8 mb-3">Contact and membership forms</h3>
        <p className="text-body text-text-secondary">
          When you use the contact form, the membership application, or the
          &quot;talk to a team member&quot; handoff inside ChamberBot, your name,
          email, phone, and whatever you typed are sent directly to the
          appropriate chamber team member by email. We keep the email for
          record-keeping; we don&apos;t sync it into a marketing database
          unless you explicitly sign up for something.
        </p>

        <h3 className="text-h3 mt-8 mb-3">Site analytics</h3>
        <p className="text-body text-text-secondary">
          Vercel Analytics and Speed Insights count page views and measure
          how fast pages load. They don&apos;t set tracking cookies and
          don&apos;t build cross-site profiles. We don&apos;t use Google
          Analytics, Facebook Pixel, or any advertising tracker on this site.
        </p>

        <h3 className="text-h3 mt-8 mb-3">Member directory data</h3>
        <p className="text-body text-text-secondary">
          The business directory pulls from the chamber&apos;s public
          GrowthZone membership database. It shows business names, addresses,
          phone numbers, and descriptions that those businesses have
          chosen to publish. If you&apos;re a member and want to change or
          remove your listing, contact{" "}
          <a href="mailto:stephanie@medinaohchamber.com" className="text-cambridge hover:underline">
            Stephanie
          </a>.
        </p>

        <h2 className="text-h2 mt-12 mb-4">Security</h2>
        <p className="text-body text-text-secondary">
          Everything on this site uses HTTPS. Form submissions are
          rate-limited and have bot-defense checks to reduce spam. Admin
          endpoints are token-gated. Error reporting goes through Sentry,
          which can see error messages but not your chat content.
        </p>

        <h2 className="text-h2 mt-12 mb-4">Cookies</h2>
        <p className="text-body text-text-secondary">
          The site sets a small number of first-party cookies for core
          functionality (remembering your theme preference, for example).
          There are no advertising or tracking cookies. You can block
          cookies in your browser without breaking the site.
        </p>

        <h2 className="text-h2 mt-12 mb-4">Your options</h2>
        <p className="text-body text-text-secondary">
          You can ask us to show you what we have about you, correct it,
          or delete it. Email{" "}
          <a href="mailto:office@medinaohchamber.com" className="text-cambridge hover:underline">
            office@medinaohchamber.com
          </a>{" "}
          with the subject line &quot;Privacy request&quot; and we&apos;ll respond
          within one business day.
        </p>

        <h2 className="text-h2 mt-12 mb-4">Changes to this page</h2>
        <p className="text-body text-text-secondary">
          We&apos;ll update this page when anything material about our data
          practices changes. The &quot;Updated&quot; date at the top tells you
          when it was last revised.
        </p>

        <h2 className="text-h2 mt-12 mb-4">Questions</h2>
        <p className="text-body text-text-secondary">
          The Greater Medina Chamber of Commerce is located at 139 N. Court
          Street, Suite A, Medina, OH 44256. Reach us at (330) 723-8773 or{" "}
          <a href="mailto:office@medinaohchamber.com" className="text-cambridge hover:underline">
            office@medinaohchamber.com
          </a>.
        </p>
      </section>

      <footer className="mt-16 pt-8 border-t border-border-secondary">
        <Link
          href="/"
          className="text-body-sm text-cambridge hover:underline font-bold"
        >
          ← Back to home
        </Link>
      </footer>
    </article>
  );
}

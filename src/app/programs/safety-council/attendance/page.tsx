import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Safety Council Attendance",
  description:
    "Check your company's Medina County Safety Council meeting credits toward the Ohio BWC Group Rebate Program.",
  alternates: { canonical: "/programs/safety-council/attendance" },
  robots: { index: false },
};

export default function AttendancePage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-f13 mb-f34">
            <div>
              <p className="text-overline text-cambridge mb-f8">Safety Council</p>
              <h1 className="text-h2">Attendance Records</h1>
              <p className="text-body text-text-secondary mt-f8 max-w-2xl">
                Track your company&apos;s progress toward the 10-meeting requirement
                for the Ohio BWC Group Rebate Program.
              </p>
            </div>
            <Link
              href="/programs/safety-council"
              className="shrink-0 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Safety Council
            </Link>
          </div>

          {/* Attendance lookup is being prepared — direct members to the chamber office. */}
          <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] max-w-2xl">
            <h2 className="text-h3">Attendance records are being prepared</h2>
            <p className="text-body text-text-secondary mt-f8 leading-relaxed">
              We&apos;re finalizing this fiscal year&apos;s Safety Council attendance
              records. To check your company&apos;s meeting credits toward the Ohio BWC
              Group Rebate Program in the meantime, contact the chamber office and
              we&apos;ll look them up for you.
            </p>
            <div className="mt-f21 space-y-f13">
              <a
                href="mailto:safety@medinaohchamber.com"
                className="
                  block w-full text-center py-f13 px-f21
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Email safety@medinaohchamber.com →
              </a>
              <a
                href="tel:+13307238773"
                className="
                  block w-full text-center py-f13 px-f21
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                (330) 723-8773
              </a>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { AttendanceViewer } from "@/components/safety-council/AttendanceViewer";
import { FY26 } from "@/data/safety-council-attendance";

export const metadata: Metadata = {
  title: "Safety Council Attendance — FY26",
  description:
    "Medina County Safety Council FY26 attendance records. Check your company's meeting credits toward the Ohio BWC Group Rebate Program.",
  alternates: { canonical: "/programs/safety-council/attendance" },
  robots: { index: false },
};

export default function AttendancePage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f34">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-f13 mb-f34">
            <div>
              <p className="text-overline text-cambridge mb-f8">Safety Council · {FY26.label}</p>
              <h1 className="text-h2">Attendance Records</h1>
              <p className="text-body text-text-secondary mt-f8 max-w-2xl">
                Use the search below to find your company and check your progress toward
                the 10-meeting requirement for the Ohio BWC Group Rebate Program.
              </p>
            </div>
            <Link
              href="/programs/safety-council"
              className="shrink-0 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Safety Council
            </Link>
          </div>

          <div className="p-f13 bg-cambridge/10 border border-cambridge/25 rounded-[var(--radius-md)] mb-f21">
            <p className="text-body-sm text-cambridge">
              <span className="font-bold">Questions about your attendance?</span>{" "}
              Email{" "}
              <a href="mailto:safety@medinaohchamber.com" className="underline underline-offset-2">
                safety@medinaohchamber.com
              </a>{" "}
              or call (330) 723-8773.
            </p>
          </div>

          <AttendanceViewer fy={FY26} />
        </FadeIn>
      </section>
    </>
  );
}

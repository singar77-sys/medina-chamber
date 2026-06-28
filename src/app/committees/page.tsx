import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getPublicCommittees } from "@/lib/committees";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Committees & Working Groups · Greater Medina Chamber of Commerce",
  description:
    "Chamber committees are where members shape programs, build relationships, and move Medina forward. Explore our committees and get involved.",
};

export default async function CommitteesPage() {
  const committees = await getPublicCommittees(db);

  return (
    <main>
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f89 pb-f34">
        <div className="max-w-3xl">
          <h1 className="text-h1 text-text-primary">Committees &amp; Working Groups</h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Chamber committees are where members shape programs, build relationships, and move
            Medina forward. Members get involved by reaching out to the chamber office.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-f89">
        {committees.length === 0 ? (
          <p className="text-body text-text-tertiary">Committee information is coming soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-f21">
            {committees.map((c) => (
              <div
                key={c.id}
                className="bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] p-f21 flex flex-col"
              >
                <h2 className="text-h4 text-text-primary">{c.name}</h2>
                {c.meetingSchedule && (
                  <p className="text-body-sm text-text-tertiary mt-f5">{c.meetingSchedule}</p>
                )}
                {c.description && (
                  <p className="text-body-sm text-text-secondary mt-f8 leading-relaxed">
                    {c.description}
                  </p>
                )}
                <p className="text-caption text-text-tertiary mt-f13">
                  {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

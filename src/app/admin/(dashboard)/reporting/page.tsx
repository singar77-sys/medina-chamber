import { db } from "@/lib/db";
import { getEngagementOverview, buildTypeBars } from "@/lib/engagement-stats";

export const dynamic = "force-dynamic";

export default async function AdminReportingPage() {
  let overview: Awaited<ReturnType<typeof getEngagementOverview>> = {
    total: 0,
    distinctOrgs: 0,
    byType: [],
    topOrgs: [],
  };
  try {
    overview = await getEngagementOverview(db, 30);
  } catch (err) {
    console.error("[admin/reporting] load failed:", err);
  }

  const bars = buildTypeBars(overview.byType).filter((b) => b.count > 0);
  const maxBar = bars[0]?.count ?? 1;

  return (
    <div className="px-f21 py-f21 max-w-5xl space-y-f21">
      <div>
        <h1 className="text-h4 text-text-primary">Engagement Reporting</h1>
        <p className="text-body-sm text-text-tertiary mt-f3">Member engagement signals, last 30 days</p>
      </div>

      <div className="grid grid-cols-3 gap-f13">
        <StatCard label="Total events (30d)" value={overview.total.toLocaleString()} />
        <StatCard label="Active signal types" value={bars.length.toString()} />
        <StatCard label="Members engaged (30d)" value={overview.distinctOrgs.toLocaleString()} />
      </div>

      {overview.total === 0 ? (
        <div className="border border-border-secondary rounded-[var(--radius-lg)] p-f21 bg-bg-primary">
          <p className="text-body-sm text-text-tertiary leading-relaxed">
            No engagement events in the last 30 days yet. Signals — event check-ins, registrations,
            deal click-throughs, portal logins, profile edits, and renewals — began recording on
            2026-06-20 and will populate here as members engage. (Directory views and website
            click-throughs arrive once the directory is database-backed.)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-f21">
          <Section title="Engagement by type">
            <ul className="space-y-1.5">
              {bars.map((b) => (
                <li key={b.type} className="flex items-center gap-2">
                  <span className="text-caption text-text-tertiary w-36 truncate">{b.label}</span>
                  <div className="flex-1 bg-bg-tertiary rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-cambridge"
                      style={{ width: `${Math.min(100, (b.count / maxBar) * 100)}%` }}
                    />
                  </div>
                  <span className="text-caption text-text-tertiary w-8 text-right">{b.count}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Most-engaged members">
            {overview.topOrgs.length === 0 ? (
              <p className="text-body-sm text-text-tertiary py-2">No member-attributed events yet.</p>
            ) : (
              <ol className="space-y-1">
                {overview.topOrgs.map((o, i) => (
                  <li
                    key={o.orgId ?? i}
                    className="flex items-center justify-between py-1 text-body-sm"
                  >
                    <span className="text-text-secondary truncate pr-2">
                      <span className="text-text-tertiary">{i + 1}.</span> {o.orgName}
                    </span>
                    <span className="text-text-tertiary shrink-0 text-caption">{o.n}</span>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border-secondary rounded-[var(--radius-lg)] p-f13 bg-bg-primary">
      <p className="text-h2 text-text-primary">{value}</p>
      <p className="text-caption text-text-tertiary mt-f3">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-secondary rounded-[var(--radius-lg)] p-f21 bg-bg-primary">
      <h2 className="text-body-sm font-bold text-text-primary mb-f8">{title}</h2>
      {children}
    </div>
  );
}

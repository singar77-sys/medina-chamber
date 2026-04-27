import { members } from "@/data/members";

export default function AdminMembersPage() {
  const total = members.length;
  const byTier = members.reduce<Record<number, number>>((acc, m) => {
    const t = m.membershipTier ?? 0;
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Members</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {total} members · Read-only. Changes come from GrowthZone via the scraper.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Read-only view.</strong> Member data is scraped from GrowthZone and lives in{" "}
        <code>src/data/members.json</code>. To add, remove, or update a member, make changes in
        GrowthZone and re-run <code>npm run scrape</code>. Tier overrides (Community Investor,
        Visibility Plus) are managed in <code>src/data/tier-overrides.ts</code> by Hunter Systems.
      </div>

      {/* Tier breakdown */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(byTier)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([tier, count]) => (
            <div key={tier} className="border border-gray-200 rounded-xl p-4 bg-white text-center">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">Tier {tier}</p>
            </div>
          ))}
        <div className="border border-gray-200 rounded-xl p-4 bg-white text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total</p>
        </div>
      </div>

      {/* Member list */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
        {members.slice(0, 50).map((m) => (
          <div key={m.chamberSlug} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{m.categories?.join(", ")}</p>
            </div>
            <span className="shrink-0 text-xs text-gray-400">Tier {m.membershipTier ?? "?"}</span>
            {m.website && (
              <a
                href={m.website}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-[#83BCA9] hover:underline"
              >
                Site ↗
              </a>
            )}
          </div>
        ))}
        {members.length > 50 && (
          <p className="px-4 py-3 text-xs text-gray-400">
            Showing 50 of {members.length} members
          </p>
        )}
      </div>
    </div>
  );
}

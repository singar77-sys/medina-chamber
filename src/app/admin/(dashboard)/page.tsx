import { getUpcomingEvents } from "@/data/events";
import { blogPosts } from "@/data/blog";
import { listCmsBlogPosts } from "@/lib/cms-store";
import { getStats } from "@/lib/chat-log";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const upcomingEvents = getUpcomingEvents().slice(0, 5);
  const recentStaticPosts = blogPosts.slice(0, 3);
  const cmsPosts = await listCmsBlogPosts();

  // Last 30 days chatbot stats
  const today = new Date().toISOString().slice(0, 10);
  const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const stats = await getStats(thirtyAgo, today).catch(() => ({
    totalMessages: 0,
    topicTotals: {} as Record<string, number>,
    topicsByDate: {} as Record<string, Record<string, number>>,
  }));

  const topTopics = Object.entries(stats.topicTotals ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="px-6 py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Greater Medina Chamber of Commerce</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Chat messages (30d)" value={stats.totalMessages.toLocaleString()} href="/admin/chat" />
        <StatCard label="Upcoming events" value={upcomingEvents.length.toString()} href="/admin/events" />
        <StatCard label="Blog posts" value={(blogPosts.length + cmsPosts.length).toString()} />
        <StatCard label="CMS posts" value={cmsPosts.length.toString()} badge={cmsPosts.length > 0 ? "custom" : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming events */}
        <Section title="Upcoming Events" href="/admin/events">
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No upcoming events.</p>
          ) : (
            <ul className="space-y-1">
              {upcomingEvents.map((evt) => (
                <li key={evt.slug}>
                  <a
                    href={`/admin/events/${evt.slug}`}
                    className="flex items-center justify-between py-1.5 text-sm hover:text-[#0C1B33] group"
                  >
                    <span className="text-gray-700 group-hover:text-[#0C1B33] truncate pr-2">
                      {evt.title}
                    </span>
                    <span className="text-gray-400 shrink-0 text-xs">
                      {evt.month} {evt.day}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Chat topics */}
        <Section title="ChamberBot Topics (30d)" href={undefined}>
          {topTopics.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No chat data yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {topTopics.map(([topic, count]) => (
                <li key={topic} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-28 capitalize">{topic.replace("-", " ")}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        background: "#83BCA9",
                        width: `${Math.min(100, (count / (topTopics[0]?.[1] ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Recent blog */}
      <Section title="Recent Blog Posts" href="/admin/blog">
        <div className="space-y-1">
          {cmsPosts.slice(0, 2).map((p) => (
            <BlogRow key={p.slug} slug={p.slug} title={p.title} date={p.dateISO} badge="CMS" />
          ))}
          {recentStaticPosts.map((p) => (
            <BlogRow key={p.slug} slug={p.slug} title={p.title} date={p.dateISO} badge="Scraped" />
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ label, value, badge, href }: { label: string; value: string; badge?: string; href?: string }) {
  const inner = (
    <>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {badge && (
        <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
          style={{ background: "#d1fae5", color: "#065f46" }}>
          {badge}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <a href={href} className="block border border-gray-200 rounded-xl p-4 bg-white hover:border-[#83BCA9] transition-colors">
        {inner}
      </a>
    );
  }
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      {inner}
    </div>
  );
}

function Section({
  title, href, children,
}: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {href && (
          <a href={href} className="text-xs text-[#83BCA9] hover:underline">View all →</a>
        )}
      </div>
      {children}
    </div>
  );
}

function BlogRow({ slug, title, date, badge }: { slug: string; title: string; date: string; badge: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span
        className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
        style={badge === "CMS"
          ? { background: "#d1fae5", color: "#065f46" }
          : { background: "#f1f5f9", color: "#64748b" }
        }
      >
        {badge}
      </span>
      <span className="text-gray-700 truncate">{title}</span>
      <span className="ml-auto text-xs text-gray-400 shrink-0">{date}</span>
    </div>
  );
}

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
    <div className="px-f21 py-f21 max-w-5xl space-y-f21">
      <div>
        <h1 className="text-h4 text-text-primary">Dashboard</h1>
        <p className="text-body-sm text-text-tertiary mt-f3">Greater Medina Chamber of Commerce</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-f13">
        <StatCard label="Chat messages (30d)" value={stats.totalMessages.toLocaleString()} href="/admin/chat" />
        <StatCard label="Upcoming events" value={upcomingEvents.length.toString()} href="/admin/events" />
        <StatCard label="Blog posts" value={(blogPosts.length + cmsPosts.length).toString()} />
        <StatCard label="CMS posts" value={cmsPosts.length.toString()} badge={cmsPosts.length > 0 ? "custom" : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-f21">
        {/* Upcoming events */}
        <Section title="Upcoming Events" href="/admin/events">
          {upcomingEvents.length === 0 ? (
            <p className="text-body-sm text-text-tertiary py-2">No upcoming events.</p>
          ) : (
            <ul className="space-y-1">
              {upcomingEvents.map((evt) => (
                <li key={evt.slug}>
                  <a
                    href={`/admin/events/${evt.slug}`}
                    className="flex items-center justify-between py-1.5 text-body-sm hover:text-text-primary group"
                  >
                    <span className="text-text-secondary group-hover:text-text-primary truncate pr-2">
                      {evt.title}
                    </span>
                    <span className="text-text-tertiary shrink-0 text-caption">
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
            <p className="text-body-sm text-text-tertiary py-2">No chat data yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {topTopics.map(([topic, count]) => (
                <li key={topic} className="flex items-center gap-2">
                  <span className="text-caption text-text-tertiary w-28 capitalize">{topic.replace("-", " ")}</span>
                  <div className="flex-1 bg-bg-tertiary rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-cambridge"
                      style={{ width: `${Math.min(100, (count / (topTopics[0]?.[1] ?? 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-caption text-text-tertiary w-8 text-right">{count}</span>
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
      <p className="text-h2 text-text-primary">{value}</p>
      <p className="text-caption text-text-tertiary mt-f3">{label}</p>
      {badge && (
        <span
          className="inline-block mt-f5 text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
          style={{ background: "#d1fae5", color: "#065f46" }}
        >
          {badge}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <a href={href} className="block border border-border-secondary rounded-[var(--radius-lg)] p-f13 bg-bg-primary hover:border-cambridge transition-colors">
        {inner}
      </a>
    );
  }
  return (
    <div className="border border-border-secondary rounded-[var(--radius-lg)] p-f13 bg-bg-primary">
      {inner}
    </div>
  );
}

function Section({
  title, href, children,
}: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border-secondary rounded-[var(--radius-lg)] p-f21 bg-bg-primary">
      <div className="flex items-center justify-between mb-f8">
        <h2 className="text-body-sm font-bold text-text-primary">{title}</h2>
        {href && (
          <a href={href} className="text-caption text-cambridge hover:underline">View all →</a>
        )}
      </div>
      {children}
    </div>
  );
}

function BlogRow({ slug, title, date, badge }: { slug: string; title: string; date: string; badge: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 text-body-sm">
      <span
        className="shrink-0 text-[10px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded"
        style={badge === "CMS"
          ? { background: "#d1fae5", color: "#065f46" }
          : { background: "#f1f5f9", color: "#64748b" }
        }
      >
        {badge}
      </span>
      <span className="text-text-secondary truncate">{title}</span>
      <span className="ml-auto text-caption text-text-tertiary shrink-0">{date}</span>
    </div>
  );
}

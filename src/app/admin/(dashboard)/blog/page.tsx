import Link from "next/link";
import { blogPosts } from "@/data/blog";
import { listCmsBlogPosts } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const cmsPosts = await listCmsBlogPosts();
  const staticPosts = blogPosts;

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Blog Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {cmsPosts.length} custom · {staticPosts.length} from GrowthZone
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-opacity hover:opacity-80"
          style={{ background: "#0C1B33" }}
        >
          + New post
        </Link>
      </div>

      {/* CMS posts */}
      {cmsPosts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
            Custom Posts (CMS)
          </h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
            {cmsPosts.map((post) => (
              <div key={post.slug} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{post.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{post.author} · {post.dateISO}</p>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: "#d1fae5", color: "#065f46" }}>
                  CMS
                </span>
                <Link
                  href={`/admin/blog/${post.slug}/edit`}
                  className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Static / scraped posts */}
      <section>
        <h2 className="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">
          GrowthZone Posts (read-only)
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          These are scraped from GrowthZone. To edit, update them there and re-run the scraper,
          or create a new CMS post with the same content.
        </p>
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100">
          {staticPosts.slice(0, 15).map((post) => (
            <div key={post.slug} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{post.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{post.author} · {post.dateISO}</p>
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "#f1f5f9", color: "#64748b" }}>
                Scraped
              </span>
              <a
                href={`/news/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
              >
                View ↗
              </a>
            </div>
          ))}
          {staticPosts.length > 15 && (
            <p className="px-4 py-3 text-xs text-gray-400">
              + {staticPosts.length - 15} more posts in GrowthZone
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

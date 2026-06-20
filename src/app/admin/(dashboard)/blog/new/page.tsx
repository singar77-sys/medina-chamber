import { BlogEditor } from "@/components/admin/BlogEditor";

export default function NewBlogPostPage() {
  return (
    <div className="px-6 py-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">New Blog Post</h1>
      <p className="text-sm text-gray-500 mb-6">
        Posts created here are published immediately to <code>/news/blog/[slug]</code>.
      </p>
      <BlogEditor mode="new" />
    </div>
  );
}

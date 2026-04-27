import { notFound } from "next/navigation";
import { getCmsBlogPost } from "@/lib/cms-store";
import { BlogEditor } from "@/components/admin/BlogEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getCmsBlogPost(slug);
  if (!post) notFound();

  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";

  return (
    <div className="px-6 py-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Edit Post</h1>
      <p className="text-sm text-gray-500 mb-6">
        <code>/news/blog/{slug}</code>
      </p>
      <BlogEditor mode="edit" post={post} adminToken={adminToken} />
    </div>
  );
}

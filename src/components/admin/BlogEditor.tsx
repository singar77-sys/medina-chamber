"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CmsBlogPost } from "@/lib/cms-store";

interface Props {
  post?: CmsBlogPost;
  mode: "new" | "edit";
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

const Field = ({
  label, error, children,
}: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
    {children}
    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
  </div>
);

export function BlogEditor({ post, mode }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!post?.slug);
  const [body, setBody] = useState(post?.body ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [author, setAuthor] = useState(post?.author ?? "Stephanie Mueller");
  const [dateISO, setDateISO] = useState(post?.dateISO ?? new Date().toISOString().slice(0, 10));
  const [image, setImage] = useState(post?.image ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugManual) setSlug(slugify(v));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required.";
    if (mode === "new" && !slug.trim()) e.slug = "Slug is required.";
    if (mode === "new" && !/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/.test(slug)) {
      e.slug = "Slug: lowercase letters, numbers, hyphens, 3–80 chars.";
    }
    if (!body.trim()) e.body = "Body is required.";
    if (!dateISO) e.dateISO = "Date is required.";
    return e;
  }

  async function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        slug: mode === "new" ? slug : post!.slug,
        title: title.trim(),
        excerpt: excerpt.trim() || body.slice(0, 160).trim(),
        body: body.trim(),
        author: author.trim() || "Medina Chamber",
        dateISO,
        image: image.trim(),
      };

      const res = await fetch("/api/admin/blog", {
        method: mode === "new" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrors({ _form: data.error ?? "Save failed." });
        return;
      }

      router.push("/admin/blog");
      router.refresh();
    } catch {
      setErrors({ _form: "Connection error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function deletePost() {
    if (!post || !confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/blog?slug=${post.slug}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      router.push("/admin/blog");
      router.refresh();
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  const inputCls = "w-full text-sm px-3 py-2 border border-border-primary rounded-md focus:outline-none focus:ring-2 focus:ring-cambridge/40";

  return (
    <div className="space-y-5">
      {errors._form && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {errors._form}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Title" error={errors.title}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            maxLength={120}
            placeholder="Post title"
            className={inputCls}
          />
        </Field>

        <Field label={mode === "new" ? "Slug (URL)" : "Slug (fixed)"} error={errors.slug}>
          <input
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
            disabled={mode === "edit"}
            maxLength={80}
            placeholder="my-post-slug"
            className={`${inputCls} ${mode === "edit" ? "bg-gray-50 text-text-tertiary" : ""}`}
          />
          {mode === "new" && <p className="text-[11px] text-text-tertiary mt-1">URL: /news/blog/{slug || "…"}</p>}
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Author">
          <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Publish Date" error={errors.dateISO}>
          <input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Image URL">
          <input type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" className={inputCls} />
        </Field>
      </div>

      <Field label="Excerpt (optional, auto-generated from body if blank)">
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          maxLength={300}
          className={inputCls}
        />
      </Field>

      <Field label="Body" error={errors.body}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          placeholder="Post body. Paragraphs are separated by blank lines."
          className={`${inputCls} resize-y font-mono text-xs`}
        />
        <p className="text-[11px] text-text-tertiary mt-1">{body.length.toLocaleString()} chars</p>
      </Field>

      <div className="flex items-center justify-between pt-2 border-t border-border-primary">
        {mode === "edit" ? (
          <button
            onClick={deletePost}
            disabled={deleting || saving}
            className="text-sm text-red-600 hover:text-red-700 disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        ) : (
          <div />
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/admin/blog")}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-bold text-white rounded-lg disabled:opacity-50 transition-opacity"
            style={{ background: "var(--color-oxford)" }}
          >
            {saving ? "Saving…" : mode === "new" ? "Publish Post" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Blog CRUD for CMS-authored posts (Redis-backed).
 *
 * GET    /api/admin/blog          — list all CMS posts
 * GET    /api/admin/blog?slug=    — get single post
 * POST   /api/admin/blog          — create post
 * PUT    /api/admin/blog          — update post
 * DELETE /api/admin/blog?slug=    — delete post
 *
 * Static blog.json posts are READ-ONLY from this API (they come from the
 * GrowthZone scraper). CMS posts live in Redis and are the only ones
 * the admin can create or modify.
 *
 * Slug rules: lowercase, letters/numbers/hyphens only, 3–80 chars.
 * Duplicate slugs with static posts are rejected.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  getCmsBlogPost,
  saveCmsBlogPost,
  deleteCmsBlogPost,
  listCmsBlogPosts,
  type CmsBlogPost,
} from "@/lib/cms-store";
import { blogPosts } from "@/data/blog";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;

function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Slug must be 3–80 lowercase chars, letters/numbers/hyphens only.";
  if (blogPosts.some((p) => p.slug === slug)) return "Slug conflicts with an existing scraped post.";
  return null;
}

function validatePost(
  body: Partial<CmsBlogPost>,
  isNew: boolean,
): { error: string } | null {
  if (isNew && !body.slug) return { error: "slug is required." };
  if (isNew) {
    const slugErr = validateSlug(body.slug!);
    if (slugErr) return { error: slugErr };
  }
  if (!body.title?.trim()) return { error: "title is required." };
  if (body.title.length > 120) return { error: "title max 120 chars." };
  if (!body.body?.trim()) return { error: "body is required." };
  if (!body.dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateISO)) {
    return { error: "dateISO must be YYYY-MM-DD." };
  }
  return null;
}

export async function GET(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (slug) {
    const post = await getCmsBlogPost(slug);
    if (!post) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ post });
  }

  const posts = await listCmsBlogPosts();
  return NextResponse.json({ posts });
}

export async function POST(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: Partial<CmsBlogPost>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validationErr = validatePost(body, true);
  if (validationErr) return NextResponse.json(validationErr, { status: 400 });

  const existing = await getCmsBlogPost(body.slug!);
  if (existing) {
    return NextResponse.json({ error: "A CMS post with this slug already exists." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const post: CmsBlogPost = {
    slug: body.slug!,
    title: body.title!.trim(),
    excerpt: body.excerpt?.trim() ?? body.body!.slice(0, 160).trim(),
    body: body.body!.trim(),
    author: body.author?.trim() || "Medina Chamber",
    dateISO: body.dateISO!,
    image: body.image?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };

  await saveCmsBlogPost(post);
  return NextResponse.json({ post }, { status: 201 });
}

export async function PUT(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: Partial<CmsBlogPost> & { slug: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body.slug) return NextResponse.json({ error: "slug is required." }, { status: 400 });

  const existing = await getCmsBlogPost(body.slug);
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  const validationErr = validatePost(body, false);
  if (validationErr) return NextResponse.json(validationErr, { status: 400 });

  const post: CmsBlogPost = {
    ...existing,
    title: body.title?.trim() ?? existing.title,
    excerpt: body.excerpt?.trim() ?? body.body?.slice(0, 160).trim() ?? existing.excerpt,
    body: body.body?.trim() ?? existing.body,
    author: body.author?.trim() ?? existing.author,
    dateISO: body.dateISO ?? existing.dateISO,
    image: body.image?.trim() ?? existing.image,
    updatedAt: new Date().toISOString(),
  };

  await saveCmsBlogPost(post);
  return NextResponse.json({ post });
}

export async function DELETE(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug." }, { status: 400 });

  const existing = await getCmsBlogPost(slug);
  if (!existing) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  await deleteCmsBlogPost(slug);
  return NextResponse.json({ ok: true });
}

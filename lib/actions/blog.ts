'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import type { BlogPost } from '@/types/database';

type UpsertBlog = {
  id?: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  featured_image_url?: string | null;
  category?: string | null;
  published?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
};

function refresh(slug?: string) {
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin/blog');
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export async function upsertBlogPost(input: UpsertBlog): Promise<SaveResult<BlogPost>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!input.title.trim()) return { ok: false, error: 'Title is required.' };
  if (!input.content.trim()) return { ok: false, error: 'Content is required.' };

  const slug = slugify(input.slug || input.title);
  if (!slug) return { ok: false, error: 'Could not generate a URL slug from the title.' };

  const row = {
    title: input.title.trim().slice(0, 200),
    slug,
    excerpt: input.excerpt?.trim().slice(0, 500) || null,
    content: input.content.slice(0, 100000),
    featured_image_url: input.featured_image_url || null,
    category: input.category?.trim().slice(0, 80) || null,
    published: input.published ?? false,
    seo_title: input.seo_title?.trim().slice(0, 200) || null,
    seo_description: input.seo_description?.trim().slice(0, 320) || null,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? ctx.admin.from('blog_posts').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('blog_posts').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) {
    console.error('[blog:upsert]', error);
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return { ok: false, error: `A post with slug "${row.slug}" already exists.` };
    }
    return { ok: false, error: error.message };
  }
  refresh(row.slug);
  return { ok: true, data: data as BlogPost };
}

export async function deleteBlogPost(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.admin
    .from('blog_posts')
    .delete()
    .eq('id', id)
    .select('slug')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  refresh(data?.slug);
  return { ok: true };
}

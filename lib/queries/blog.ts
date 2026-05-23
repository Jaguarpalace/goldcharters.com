import { getServerSupabase } from '@/lib/supabase/server';
import { mockBlogPosts } from '@/lib/mock-data';
import type { BlogPost } from '@/types/database';

export async function getBlogPosts(opts?: {
  includeUnpublished?: boolean;
}): Promise<BlogPost[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const posts = mockBlogPosts();
    return opts?.includeUnpublished ? posts : posts.filter((p) => p.published);
  }

  let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
  if (!opts?.includeUnpublished) query = query.eq('published', true);

  const { data, error } = await query;
  if (error || !data) {
    const posts = mockBlogPosts();
    return opts?.includeUnpublished ? posts : posts.filter((p) => p.published);
  }
  return data as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return mockBlogPosts().find((p) => p.slug === slug && p.published) ?? null;
  }
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error || !data) return null;
  return data as BlogPost;
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return mockBlogPosts().find((p) => p.id === id) ?? null;
  }
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data as BlogPost;
}

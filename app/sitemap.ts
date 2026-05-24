import type { MetadataRoute } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { BUY_ENABLED } from '@/lib/features';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

/**
 * Auto-generated sitemap. Google fetches /sitemap.xml on a schedule; submit it once
 * in Google Search Console and every new product / blog post is discovered automatically.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/sell-gold`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/sell-jewellery`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/sell-handbags`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/sell-watches`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/gold-calculator`, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/faqs`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Add shop pages only when buy is enabled.
  if (BUY_ENABLED) {
    staticPages.push({
      url: `${SITE_URL}/shop`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    });
  }

  const supabase = getServerSupabase();
  if (!supabase) return staticPages;

  // Dynamically include blog posts.
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true);

  const blogEntries: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  // And products (only when shop is enabled).
  if (BUY_ENABLED) {
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('visible', true)
      .in('status', ['active', 'reserved', 'sold']);

    const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
      url: `${SITE_URL}/shop/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticPages, ...blogEntries, ...productEntries];
  }

  return [...staticPages, ...blogEntries];
}

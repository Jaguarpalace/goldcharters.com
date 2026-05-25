import type { MetadataRoute } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { BUY_ENABLED } from '@/lib/features';
import { LOCATIONS } from '@/lib/content/locations';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

/**
 * Auto-generated sitemap. Google fetches /sitemap.xml on a schedule;
 * lastModified for each page is pulled live from the underlying CMS row
 * (page_seo / legal_pages / blog_posts / products / homepage_sections)
 * so every admin edit becomes a freshness signal Google picks up on its
 * next sitemap fetch.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = getServerSupabase();

  // ----- Pull CMS-driven freshness timestamps in parallel ------------------
  // Each entry is a (slug, lastModified) map. Slugs match the route paths
  // including the leading '/'.
  const cmsFreshness = new Map<string, Date>();

  if (supabase) {
    const [seoRes, legalRes, sectionsRes] = await Promise.all([
      supabase.from('page_seo').select('slug, updated_at'),
      supabase.from('legal_pages').select('slug, updated_at'),
      // The homepage prose blocks all affect '/'. Pick the freshest.
      supabase.from('homepage_sections').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    ]);

    for (const row of (seoRes.data ?? []) as Array<{ slug: string; updated_at: string }>) {
      cmsFreshness.set(row.slug, new Date(row.updated_at));
    }
    for (const row of (legalRes.data ?? []) as Array<{ slug: string; updated_at: string }>) {
      cmsFreshness.set(`/${row.slug}`, new Date(row.updated_at));
    }
    // Homepage sections override '/' if newer than the page_seo row.
    const newestSection = (sectionsRes.data ?? [])[0] as { updated_at: string } | undefined;
    if (newestSection) {
      const sectionDate = new Date(newestSection.updated_at);
      const existing = cmsFreshness.get('/');
      if (!existing || sectionDate > existing) cmsFreshness.set('/', sectionDate);
    }
  }

  /** Last-modified for a slug, falling back to now if no CMS row exists. */
  const lastMod = (slug: string): Date => cmsFreshness.get(slug) ?? now;

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,                 lastModified: lastMod('/'),                 changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/sell-gold`,        lastModified: lastMod('/sell-gold'),        changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/sell-jewellery`,   lastModified: lastMod('/sell-jewellery'),   changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/sell-handbags`,    lastModified: lastMod('/sell-handbags'),    changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/sell-watches`,     lastModified: lastMod('/sell-watches'),     changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/gold-calculator`,  lastModified: lastMod('/gold-calculator'),  changeFrequency: 'daily',   priority: 0.85 },
    { url: `${SITE_URL}/blog`,             lastModified: lastMod('/blog'),             changeFrequency: 'weekly',  priority: 0.75 },
    { url: `${SITE_URL}/faqs`,             lastModified: lastMod('/faqs'),             changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${SITE_URL}/how-it-works`,     lastModified: lastMod('/how-it-works'),     changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/contact`,          lastModified: lastMod('/contact'),          changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/locations`,        lastModified: lastMod('/locations'),        changeFrequency: 'monthly', priority: 0.7 },
    ...LOCATIONS.map((l) => ({
      url: `${SITE_URL}/locations/${l.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    // Legal pages — admin's "Mark reviewed" button bumps these timestamps.
    { url: `${SITE_URL}/privacy`, lastModified: lastMod('/privacy'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`,   lastModified: lastMod('/terms'),   changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/cookies`, lastModified: lastMod('/cookies'), changeFrequency: 'yearly', priority: 0.3 },
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

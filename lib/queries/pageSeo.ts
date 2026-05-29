import type { Metadata } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo/structuredData';
import type { PageSeo } from '@/types/database';

/**
 * Hardcoded defaults guarantee the public site renders a sensible <title>
 * even if the page_seo table is empty or unreachable. These mirror the
 * seed values in migration 018 — the CMS is an *override* layer, never
 * a *required* layer.
 */
const SEO_DEFAULTS: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Charters Gold · Private UK Gold & Jewellery Specialists',
    description:
      'Sell gold, diamonds, fine jewellery, luxury watches and designer handbags to a discreet UK private valuation house. Same-day payment, transparent valuations, no obligation.',
  },
  '/sell-gold': {
    title: 'Sell Gold For Cash · Private UK Specialists',
    description:
      'Sell gold rings, chains, bracelets, coins, bars and scrap gold to a discreet UK private valuation house. Same-day payment, live spot pricing, no obligation.',
  },
  '/sell-silver': {
    title: 'Sell Silver For Cash · Private UK Specialists',
    description:
      'Sell sterling silver, silver coins, bars, scrap silver and hallmarked pieces to a discreet UK private valuation house. Same-day payment, live spot pricing, no obligation.',
  },
  '/sell-jewellery': {
    title: 'Sell Fine Jewellery · Diamond, Antique & Branded Specialists',
    description:
      'Receive a professional valuation for diamond rings, designer jewellery, antique pieces and inherited jewellery from a discreet UK private specialist.',
  },
  '/sell-handbags': {
    title: 'Sell Designer Handbags · Hermès, Chanel, Louis Vuitton · UK Specialists',
    description:
      'Sell pre-loved designer handbags - Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada - to a discreet UK private specialist. Authentication included. Same-day payment available.',
  },
  '/sell-watches': {
    title: 'Sell Luxury Watches · Rolex, Patek Philippe, AP · UK Specialists',
    description:
      'Sell luxury watches - Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier - to a discreet UK specialist. Movement, papers and provenance fully assessed. Same-day payment available.',
  },
  '/contact': {
    title: 'Contact · Private Valuations',
    description:
      'Speak with a Charters Gold specialist. Telephone, email, WhatsApp or in-person appointment in Egham, Surrey.',
  },
  '/book': {
    title: 'Book a Private Appointment · Gold & Jewellery Valuations',
    description:
      'Reserve a private valuation slot at our Egham showroom or a UK pop-up location. Pick a date and time, meet a specialist in person - no obligation to sell.',
  },
  '/blog': {
    title: 'Insights & Guides · Charters Gold',
    description:
      'Practical guides on selling gold, fine jewellery, luxury watches and designer handbags in the UK - written by Charters Gold specialists.',
  },
  '/gold-calculator': {
    title: 'Gold Calculator · Live Price Per Gram',
    description:
      'Free gold calculator with live spot pricing. Enter weights in grams across 9ct, 14ct, 18ct, 22ct, 24ct gold plus silver, platinum and palladium - instant guide price.',
  },
  '/how-it-works': {
    title: 'How It Works · Selling Gold & Jewellery To Us',
    description:
      'A simple three-step process: tell us about your items, receive a professional valuation, get paid by bank transfer. No pressure, no obligation.',
  },
  '/faqs': {
    title: 'Frequently Asked Questions',
    description:
      'Answers to common questions about selling gold, jewellery, watches and handbags, our valuation process, ID requirements and payment timelines.',
  },
  '/locations': {
    title: 'Areas We Cover · UK Gold & Jewellery Specialists',
    description:
      'Private valuations across Surrey, London, Berkshire and the wider South-East. By appointment, with discretion and same-day payment.',
  },
};

/** Fetch SEO metadata for a route slug. Returns null when the row doesn't exist. */
export async function getPageSeo(slug: string): Promise<PageSeo | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('page_seo')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as PageSeo;
}

/** Fetch every row — used by /admin/seo to render the editing board. */
export async function listPageSeo(): Promise<PageSeo[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('page_seo')
    .select('*')
    .order('slug', { ascending: true });
  if (error || !data) return [];
  return data as PageSeo[];
}

/**
 * Build a fully-populated Next.js Metadata object for a page.
 *
 * Order of precedence:
 *   1. DB row (admin override)
 *   2. Hardcoded SEO_DEFAULTS for the slug
 *   3. Global fallback so a brand-new untouched page still has a title
 *
 * This is the only public entry point pages should use — keeps SEO logic
 * in one place and ensures every page emits a canonical URL, OG tags and
 * keywords consistently.
 */
export async function buildPageMetadata(slug: string): Promise<Metadata> {
  const row = await getPageSeo(slug);
  const fallback = SEO_DEFAULTS[slug] ?? {
    title: 'Charters Gold',
    description: 'Private UK valuations for gold, jewellery, watches and handbags.',
  };

  const title = row?.title ?? fallback.title;
  const description = row?.description ?? fallback.description;
  const canonical = row?.canonical_url ?? `${SITE_URL}${slug}`;
  const ogTitle = row?.og_title ?? title;
  const ogDescription = row?.og_description ?? description;

  return {
    // Absolute title bypasses the root layout's "%s · Charters Gold"
    // template. The CMS value is the *final* string we want Google to see —
    // admins use the live preview in /admin/seo to know exactly what
    // appears. Pages keep their brand name in the title where useful but
    // we never silently append it.
    title: { absolute: title },
    description,
    keywords: row?.keywords ?? undefined,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: ogTitle,
      description: ogDescription,
      ...(row?.og_image_url
        ? { images: [{ url: row.og_image_url, alt: ogTitle }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      ...(row?.og_image_url ? { images: [row.og_image_url] } : {}),
    },
  };
}

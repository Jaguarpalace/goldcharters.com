import type { MetadataRoute } from 'next';
import { BUY_ENABLED } from '@/lib/features';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/admin/',
    '/admin',
    '/api/',
    // Basket + checkout never belong in search results.
    '/basket',
    '/checkout',
  ];

  // While the shop is paused, also keep crawlers out of /shop and /shop/*
  // so search engines don't keep stale product URLs indexed.
  if (!BUY_ENABLED) {
    disallow.push('/shop', '/shop/');
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

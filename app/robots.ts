import type { MetadataRoute } from 'next';

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

  // Deliberately NOT disallowing /shop while the shop is paused: the shop
  // pages serve a noindex meta tag, and Google can only see it if it's
  // allowed to crawl them. Disallowing would leave stale product URLs
  // stuck in the index as "indexed, though blocked by robots.txt".

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

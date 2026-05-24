// JSON-LD structured data helpers — pure data, no JSX.
// Inject the output into a <script type="application/ld+json"> tag via the
// <JsonLd /> component in structuredData.tsx.

import type { Faq, SiteSettings } from '@/types/database';
import { FAQ_CATEGORY_LABELS } from '@/lib/format';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chartersgold.co.uk';

export function organizationSchema(settings: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: settings.business_name,
    legalName: settings.business_name,
    url: SITE_URL,
    logo: `${SITE_URL}/logo/charters-gold.webp`,
    description: settings.seo_description,
    email: settings.email,
    telephone: settings.phone,
    address: settings.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: 'Avalon House, Unit 7A, Egham Business Village, Crabtree Road',
          addressLocality: 'Egham',
          addressRegion: 'Surrey',
          postalCode: 'TW20 8RB',
          addressCountry: 'GB',
        }
      : undefined,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: settings.phone,
      email: settings.email,
      availableLanguage: ['en-GB'],
      areaServed: 'GB',
    },
    sameAs: settings.social_links ? Object.values(settings.social_links) : undefined,
  };
}

/**
 * LocalBusiness markup — eligible for the Google "knowledge panel" + Maps cards.
 * We use a Store subtype since this is a precious metals trader.
 */
export function localBusinessSchema(settings: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Store'],
    '@id': `${SITE_URL}#localbusiness`,
    name: settings.business_name,
    image: `${SITE_URL}/logo/charters-gold.webp`,
    url: SITE_URL,
    telephone: settings.phone,
    email: settings.email,
    priceRange: '£££',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Avalon House, Unit 7A, Egham Business Village, Crabtree Road',
      addressLocality: 'Egham',
      addressRegion: 'Surrey',
      postalCode: 'TW20 8RB',
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 51.4321,
      longitude: -0.5582,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '18:00',
      },
    ],
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
  };
}

export function websiteSchema(settings: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}#website`,
    url: SITE_URL,
    name: settings.business_name,
    description: settings.seo_description,
    publisher: { '@id': `${SITE_URL}#organization` },
    inLanguage: 'en-GB',
  };
}

/**
 * FAQPage schema — drives the expandable Q&A boxes in Google search results.
 * Highly clickable, direct CTR booster.
 */
export function faqPageSchema(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
      about: FAQ_CATEGORY_LABELS[f.category],
    })),
  };
}

export function serviceSchema({
  name,
  description,
  url,
  serviceType,
}: {
  name: string;
  description: string;
  url: string;
  serviceType: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    serviceType,
    provider: { '@id': `${SITE_URL}#organization` },
    areaServed: { '@type': 'Country', name: 'United Kingdom' },
    url,
  };
}

/**
 * Article schema for a single blog post. Powers rich-result eligibility
 * (date badge, author, image, headline) in Google search results.
 */
export function articleSchema(post: {
  title: string;
  slug: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.featured_image_url ?? `${SITE_URL}/logo/charters-gold.webp`,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: { '@id': `${SITE_URL}#organization` },
    publisher: { '@id': `${SITE_URL}#organization` },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/**
 * LocalBusiness markup specialised for a per-location landing page.
 * Same business, different `areaServed` and a unique @id so Google can
 * understand the page as a service-area page rather than a duplicate
 * of the head-office LocalBusiness schema.
 */
export function locationLocalBusinessSchema(input: {
  settings: SiteSettings;
  locationSlug: string;
  locationName: string;
  region?: string;
  description: string;
}) {
  const { settings, locationSlug, locationName, region, description } = input;
  return {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'Store'],
    '@id': `${SITE_URL}/locations/${locationSlug}#localbusiness`,
    name: `${settings.business_name} — ${locationName}`,
    description,
    image: `${SITE_URL}/logo/charters-gold.webp`,
    url: `${SITE_URL}/locations/${locationSlug}`,
    telephone: settings.phone,
    email: settings.email,
    priceRange: '£££',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Avalon House, Unit 7A, Egham Business Village, Crabtree Road',
      addressLocality: 'Egham',
      addressRegion: 'Surrey',
      postalCode: 'TW20 8RB',
      addressCountry: 'GB',
    },
    areaServed: {
      '@type': 'Place',
      name: locationName,
      ...(region ? { containedInPlace: { '@type': 'AdministrativeArea', name: region } } : {}),
    },
  };
}

/** FAQPage schema built from a location page's bespoke FAQ block. */
export function locationFaqSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export { SITE_URL };

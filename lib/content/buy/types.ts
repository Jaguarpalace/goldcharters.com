/**
 * Bespoke "we buy" landing pages.
 *
 * Same hardcoded-content philosophy as the location pages: one TypeScript
 * file per item type, with genuinely distinct copy, FAQs and value-driver
 * commentary. No admin-editable layer here on purpose. Template-spun pages
 * are exactly what Google's Helpful Content update demotes.
 */

export type BuySection = {
  title: string;
  body: string;
};

export type BuyFaq = {
  question: string;
  answer: string;
};

export type BuyContent = {
  /** URL slug, matches the filename. e.g. "broken-gold" → /we-buy/broken-gold */
  slug: string;
  /** Display name used in hero, breadcrumbs, sitemap. */
  name: string;
  /** Short category for the index-page grouping. */
  group: 'gold' | 'jewellery';

  metaTitle: string;
  metaDescription: string;

  heroEyebrow: string;
  heroTitle: string;
  heroIntro: string;

  /** Free-flowing body sections (3 to 5 each page). */
  sections: BuySection[];

  faqs: BuyFaq[];

  cta: {
    title: string;
    body: string;
  };
};

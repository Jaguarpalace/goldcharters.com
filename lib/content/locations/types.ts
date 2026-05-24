/**
 * Bespoke location landing pages.
 *
 * Each location is a hardcoded TypeScript file in this directory. We
 * deliberately avoid an admin/DB-backed system here so the content stays
 * editorial (real route info, real neighbourhoods, real local context)
 * rather than template-spun — which Google's Helpful Content algorithm
 * actively demotes.
 */

export type LocationProcessOption = {
  icon: 'in-person' | 'collect' | 'post';
  title: string;
  body: string;
};

export type LocationFaq = {
  question: string;
  answer: string;
};

export type LocationContent = {
  /** URL slug, matches the filename. e.g. "london" → /locations/london */
  slug: string;
  /** Full display name, e.g. "London". */
  name: string;
  /** Optional region/county for the JSON-LD areaServed payload. */
  region?: string;
  /** Postcode prefix(es) covered, used in copy and schema. */
  postcodes?: string;

  /* ---- Meta / SEO ---- */
  metaTitle: string;
  metaDescription: string;

  /* ---- Hero ---- */
  heroEyebrow: string;
  heroTitle: string;
  heroIntro: string;

  /* ---- Travel & catchment ---- */
  travel: {
    distanceMiles: number;
    drive: string;
    publicTransport: string;
  };

  /* ---- Why clients in this area choose us ---- */
  whyHere: { title: string; body: string }[];

  /* ---- Specific places we cover within this area ---- */
  neighbourhoods: string[];

  /* ---- How they engage with us (in-person / collect / postal) ---- */
  processOptions: LocationProcessOption[];

  /* ---- What pieces are common from this area ---- */
  commonPieces: { title: string; body: string };

  /* ---- Local-specific FAQ ---- */
  faqs: LocationFaq[];

  /* ---- Final CTA copy block ---- */
  cta: { title: string; body: string };
};

import type { BuyContent } from './types';
import { goldJewellery } from './gold-jewellery';
import { brokenGold } from './broken-gold';
import { unwantedJewellery } from './unwanted-jewellery';
import { weddingRings } from './wedding-rings';
import { vintageJewellery } from './vintage-jewellery';
import { brandedJewellery } from './branded-jewellery';
import { luxuryNecklaces } from './luxury-necklaces';
import { luxuryBracelets } from './luxury-bracelets';

/**
 * Ordered list of buy-side landing pages. Order matters: it controls the
 * sequence on /we-buy (index), the footer linking, and the sitemap.
 */
export const BUY_PAGES: BuyContent[] = [
  goldJewellery,
  brokenGold,
  unwantedJewellery,
  weddingRings,
  vintageJewellery,
  brandedJewellery,
  luxuryNecklaces,
  luxuryBracelets,
];

const BY_SLUG = new Map(BUY_PAGES.map((p) => [p.slug, p]));

export function getBuyPageBySlug(slug: string): BuyContent | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAllBuySlugs(): string[] {
  return BUY_PAGES.map((p) => p.slug);
}

export type { BuyContent } from './types';

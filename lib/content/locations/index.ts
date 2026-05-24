import type { LocationContent } from './types';
import { london } from './london';
import { windsor } from './windsor';
import { surrey } from './surrey';
import { ascot } from './ascot';
import { heathrow } from './heathrow';
import { reading } from './reading';
import { twickenhamRichmond } from './twickenham-richmond';
import { stainesEgham } from './staines-egham';

/**
 * Locations are deliberately ordered by relevance / commercial priority,
 * not alphabetically. This is the order they appear in the locations
 * index, the footer "Areas We Cover" block, and the sitemap.
 */
export const LOCATIONS: LocationContent[] = [
  stainesEgham,
  london,
  windsor,
  surrey,
  ascot,
  heathrow,
  twickenhamRichmond,
  reading,
];

/** O(1) lookup by URL slug. */
const BY_SLUG = new Map(LOCATIONS.map((l) => [l.slug, l]));

export function getLocationBySlug(slug: string): LocationContent | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAllLocationSlugs(): string[] {
  return LOCATIONS.map((l) => l.slug);
}

export type { LocationContent } from './types';

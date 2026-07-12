import type { LocationContent } from './types';
import { london } from './london';
import { windsor } from './windsor';
import { surrey } from './surrey';
import { ascot } from './ascot';
import { heathrow } from './heathrow';
import { reading } from './reading';
import { twickenhamRichmond } from './twickenham-richmond';
import { stainesEgham } from './staines-egham';
import { virginiaWaterWentworth } from './virginia-water-wentworth';
import { maidenheadBray } from './maidenhead-bray';
import { weybridgeEsherCobham } from './weybridge-esher-cobham';
import { guildford } from './guildford';
import { woking } from './woking';
import { kingstonUponThames } from './kingston-upon-thames';
import { beaconsfieldGerrardsCross } from './beaconsfield-gerrards-cross';
import { hounslow } from './hounslow';
import { hillingdonUxbridge } from './hillingdon-uxbridge';
import { ealing } from './ealing';

/**
 * Locations are deliberately ordered by relevance / commercial priority,
 * not alphabetically. This is the order they appear in the locations
 * index, the footer "Areas We Cover" block, and the sitemap.
 */
export const LOCATIONS: LocationContent[] = [
  ascot,
  virginiaWaterWentworth,
  windsor,
  surrey,
  stainesEgham,
  london,
  weybridgeEsherCobham,
  maidenheadBray,
  woking,
  guildford,
  kingstonUponThames,
  beaconsfieldGerrardsCross,
  twickenhamRichmond,
  hounslow,
  hillingdonUxbridge,
  ealing,
  heathrow,
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

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

/**
 * Curated geographic adjacency, used for the "nearby areas" cross-links on
 * each location page. Hand-picked rather than computed so the links always
 * make human sense (real neighbouring catchments, 4-5 per page). These
 * internal links teach Google which page belongs to which town — every
 * entry is resolved through BY_SLUG, so a typo yields a missing link,
 * never a broken one.
 */
const NEARBY: Record<string, string[]> = {
  'ascot': ['virginia-water-wentworth', 'windsor', 'staines-egham', 'maidenhead-bray', 'woking'],
  'virginia-water-wentworth': ['ascot', 'staines-egham', 'windsor', 'weybridge-esher-cobham', 'woking'],
  'windsor': ['maidenhead-bray', 'ascot', 'staines-egham', 'virginia-water-wentworth', 'heathrow'],
  'surrey': ['guildford', 'woking', 'weybridge-esher-cobham', 'virginia-water-wentworth', 'staines-egham'],
  'staines-egham': ['virginia-water-wentworth', 'ascot', 'windsor', 'heathrow', 'twickenham-richmond'],
  'london': ['kingston-upon-thames', 'twickenham-richmond', 'ealing', 'hounslow', 'hillingdon-uxbridge'],
  'weybridge-esher-cobham': ['woking', 'kingston-upon-thames', 'virginia-water-wentworth', 'guildford', 'staines-egham'],
  'maidenhead-bray': ['windsor', 'ascot', 'beaconsfield-gerrards-cross', 'reading', 'heathrow'],
  'woking': ['guildford', 'weybridge-esher-cobham', 'virginia-water-wentworth', 'ascot', 'surrey'],
  'guildford': ['woking', 'weybridge-esher-cobham', 'surrey', 'ascot'],
  'kingston-upon-thames': ['twickenham-richmond', 'weybridge-esher-cobham', 'hounslow', 'london'],
  'beaconsfield-gerrards-cross': ['hillingdon-uxbridge', 'maidenhead-bray', 'windsor', 'heathrow'],
  'twickenham-richmond': ['kingston-upon-thames', 'hounslow', 'staines-egham', 'ealing', 'london'],
  'hounslow': ['twickenham-richmond', 'ealing', 'heathrow', 'hillingdon-uxbridge', 'staines-egham'],
  'hillingdon-uxbridge': ['ealing', 'hounslow', 'heathrow', 'beaconsfield-gerrards-cross'],
  'ealing': ['hounslow', 'hillingdon-uxbridge', 'twickenham-richmond', 'london'],
  'heathrow': ['hounslow', 'staines-egham', 'windsor', 'hillingdon-uxbridge'],
  'reading': ['maidenhead-bray', 'windsor', 'ascot'],
};

/** Neighbouring location pages for the given slug (empty if none defined). */
export function getNearbyLocations(slug: string): LocationContent[] {
  return (NEARBY[slug] ?? [])
    .map((s) => BY_SLUG.get(s))
    .filter((l): l is LocationContent => Boolean(l));
}

/**
 * County grouping for the /locations index. Explicit slug lists (the
 * per-file `region` strings are display copy, too inconsistent to group
 * by). Any location missing from every group is appended to a trailing
 * "Also covered" group so new batches can never silently vanish from
 * the index.
 */
const COUNTY_GROUPS: Array<{ title: string; slugs: string[] }> = [
  {
    title: 'Berkshire',
    slugs: ['ascot', 'windsor', 'maidenhead-bray', 'reading'],
  },
  {
    title: 'Surrey',
    slugs: ['virginia-water-wentworth', 'weybridge-esher-cobham', 'woking', 'guildford', 'staines-egham', 'surrey'],
  },
  {
    title: 'London',
    slugs: ['london', 'kingston-upon-thames', 'twickenham-richmond', 'hounslow', 'hillingdon-uxbridge', 'ealing', 'heathrow'],
  },
  {
    title: 'Buckinghamshire',
    slugs: ['beaconsfield-gerrards-cross'],
  },
];

export function getLocationGroups(): Array<{ title: string; locations: LocationContent[] }> {
  const grouped = COUNTY_GROUPS.map((g) => ({
    title: g.title,
    locations: g.slugs
      .map((s) => BY_SLUG.get(s))
      .filter((l): l is LocationContent => Boolean(l)),
  })).filter((g) => g.locations.length > 0);

  const placed = new Set(grouped.flatMap((g) => g.locations.map((l) => l.slug)));
  const leftovers = LOCATIONS.filter((l) => !placed.has(l.slug));
  if (leftovers.length > 0) grouped.push({ title: 'Also covered', locations: leftovers });

  return grouped;
}

export type { LocationContent } from './types';

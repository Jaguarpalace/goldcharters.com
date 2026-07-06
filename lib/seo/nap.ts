import type { SiteSettings } from '@/types/database';

/**
 * NAP (Name / Address / Phone) — the single source of truth for the
 * business address.
 *
 * The structured fields live on site_settings and are edited from
 * /admin/settings. Everything address-shaped on the site derives from them:
 *
 *   - JSON-LD PostalAddress + GeoCoordinates (structuredData.ts)
 *   - The display string in the footer, contact page, legal pages and
 *     email templates (settings.address, composed on save — see
 *     lib/actions/siteSettings.ts)
 *
 * The DEFAULT_NAP constants below are the fallback for a fresh install or
 * an unreachable database, mirroring the seeded values. They are NOT a
 * second source of truth — if the admin edits the address, the DB wins.
 */

export const DEFAULT_NAP = {
  street: "Index House, St George's Lane",
  locality: 'Ascot',
  region: 'Berkshire',
  postcode: 'SL5 7ET',
  latitude: 51.4084,
  longitude: -0.6726,
} as const;

/** Structured address values with per-field fallback to the defaults. */
export function getNap(settings: SiteSettings) {
  return {
    street: settings.address_street ?? DEFAULT_NAP.street,
    locality: settings.address_locality ?? DEFAULT_NAP.locality,
    region: settings.address_region ?? DEFAULT_NAP.region,
    postcode: settings.address_postcode ?? DEFAULT_NAP.postcode,
    latitude: settings.address_latitude ?? DEFAULT_NAP.latitude,
    longitude: settings.address_longitude ?? DEFAULT_NAP.longitude,
  };
}

/** schema.org PostalAddress built from the settings NAP. */
export function postalAddress(settings: SiteSettings) {
  const nap = getNap(settings);
  return {
    '@type': 'PostalAddress',
    streetAddress: nap.street,
    addressLocality: nap.locality,
    addressRegion: nap.region,
    postalCode: nap.postcode,
    addressCountry: 'GB',
  };
}

/** schema.org GeoCoordinates built from the settings NAP. */
export function geoCoordinates(settings: SiteSettings) {
  const nap = getNap(settings);
  return {
    '@type': 'GeoCoordinates',
    latitude: nap.latitude,
    longitude: nap.longitude,
  };
}

/**
 * One-line display address, e.g.
 * "Index House, St George's Lane, Ascot, Berkshire, SL5 7ET".
 * Used to compose settings.address when the admin saves.
 */
export function formatAddress(parts: {
  street: string;
  locality: string;
  region: string;
  postcode: string;
}): string {
  return [parts.street, parts.locality, parts.region, parts.postcode]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
}

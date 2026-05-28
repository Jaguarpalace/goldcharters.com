// Pure, client-safe distance helpers for the nearest-location search.

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in miles between two points. */
export function haversineMiles(a: LatLng, b: LatLng): number {
  const R = 3958.7613; // Earth radius, miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Human label, e.g. "here", "3.2 miles away", "47 miles away". */
export function formatDistance(miles: number): string {
  if (miles < 0.3) return 'at this location';
  if (miles < 10) return `${miles.toFixed(1)} miles away`;
  return `${Math.round(miles)} miles away`;
}

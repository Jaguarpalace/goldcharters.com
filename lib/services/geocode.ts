import 'server-only';

/**
 * UK postcode geocoding via postcodes.io — a free, public, no-API-key service.
 * Returns null on any failure (bad postcode, network error) so callers can
 * surface a friendly message and never crash. Tries the full postcode first,
 * then falls back to the outward code (e.g. "RG12") for partial inputs.
 */
export type GeoPoint = { lat: number; lng: number };

export async function geocodePostcode(input: string): Promise<GeoPoint | null> {
  const pc = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!pc || pc.length < 2 || pc.length > 8) return null;

  try {
    const full = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`,
      { cache: 'no-store' },
    );
    if (full.ok) {
      const j = await full.json();
      const r = j?.result;
      if (r && typeof r.latitude === 'number' && typeof r.longitude === 'number') {
        return { lat: r.latitude, lng: r.longitude };
      }
    }

    // Fall back to the outward code (everything but the final 3 chars).
    const outward = pc.length > 3 ? pc.slice(0, pc.length - 3) : pc;
    const out = await fetch(
      `https://api.postcodes.io/outcodes/${encodeURIComponent(outward)}`,
      { cache: 'no-store' },
    );
    if (out.ok) {
      const j = await out.json();
      const r = j?.result;
      if (r && typeof r.latitude === 'number' && typeof r.longitude === 'number') {
        return { lat: r.latitude, lng: r.longitude };
      }
    }
  } catch (err) {
    console.error('[geocode]', err);
  }
  return null;
}

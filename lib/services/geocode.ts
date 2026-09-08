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

/* ------------------------------------------------------------------ bulk */

const BULK_LIMIT = 100;

/**
 * Geocode many postcodes in one round trip per 100 (postcodes.io bulk
 * endpoint). Keys in the result are the normalised postcode (upper-case, no
 * spaces); a postcode that could not be resolved maps to null. Used by the
 * Customers map backfill. Never throws.
 */
export async function geocodePostcodesBulk(
  inputs: string[],
): Promise<Map<string, GeoPoint | null>> {
  const out = new Map<string, GeoPoint | null>();
  const norm = [...new Set(inputs.map((p) => p.trim().toUpperCase().replace(/\s+/g, '')).filter(Boolean))];
  for (let i = 0; i < norm.length; i += BULK_LIMIT) {
    const chunk = norm.slice(i, i + BULK_LIMIT);
    try {
      const res = await fetch('https://api.postcodes.io/postcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postcodes: chunk }),
        cache: 'no-store',
      });
      if (!res.ok) {
        for (const p of chunk) out.set(p, null);
        continue;
      }
      const j = (await res.json()) as {
        result?: Array<{ query: string; result: { latitude: number; longitude: number } | null }>;
      };
      for (const row of j.result ?? []) {
        const key = row.query.toUpperCase().replace(/\s+/g, '');
        const r = row.result;
        out.set(
          key,
          r && typeof r.latitude === 'number' && typeof r.longitude === 'number'
            ? { lat: r.latitude, lng: r.longitude }
            : null,
        );
      }
      for (const p of chunk) if (!out.has(p)) out.set(p, null);
    } catch {
      for (const p of chunk) out.set(p, null);
    }
  }
  // Partial or mistyped postcodes: fall back to the outward-code centroid
  // one by one (rare, so the extra round trips do not matter).
  for (const [key, val] of out) {
    if (val === null) out.set(key, await geocodePostcode(key));
  }
  return out;
}

/** Normalised form used as the cache key on customers.geocode_postcode. */
export function normalisePostcode(p: string | null | undefined): string | null {
  const n = (p ?? '').trim().toUpperCase().replace(/\s+/g, '');
  return n || null;
}

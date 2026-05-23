// SERVER-ONLY metal price service. Never import from a client component.
// Uses Next.js fetch cache (revalidate: 900) so a maximum of one request per
// 15 minutes hits the API per region — even at thousands of concurrent visitors.

import 'server-only';

const TROY_OUNCE_GRAMS = 31.1034768;
const REVALIDATE_SECONDS = 60 * 15; // 15 minutes

export type MetalSpot = {
  /** £ per gram of pure (99.99%) metal */
  per_gram_gbp: number;
  /** £ per troy ounce of pure metal — useful for bullion */
  per_ounce_gbp: number;
};

export type MetalSnapshot = {
  fetched_at: string;
  /** Live & cached. null when the API is not configured or the request failed. */
  gold: MetalSpot | null;
  silver: MetalSpot | null;
  platinum: MetalSpot | null;
  palladium: MetalSpot | null;
};

type MetalPriceApiResponse = {
  success?: boolean;
  base?: string;
  rates?: Record<string, number>;
  error?: { code?: number; info?: string };
};

const SYMBOLS = ['XAU', 'XAG', 'XPT', 'XPD'] as const;
type Symbol = (typeof SYMBOLS)[number];

function isApiConfigured() {
  return Boolean(process.env.METAL_PRICE_API_KEY);
}

/**
 * One canonical place to read the spot prices.
 * Returns gracefully degraded data (nulls) on failure — callers should
 * always handle the null case (show fallback / hide the ticker).
 */
export async function getMetalSpots(): Promise<MetalSnapshot> {
  const empty: MetalSnapshot = {
    fetched_at: new Date().toISOString(),
    gold: null,
    silver: null,
    platinum: null,
    palladium: null,
  };

  if (!isApiConfigured()) return empty;

  const key = process.env.METAL_PRICE_API_KEY!;
  const url = new URL('https://api.metalpriceapi.com/v1/latest');
  url.searchParams.set('api_key', key);
  url.searchParams.set('base', 'GBP');
  url.searchParams.set('currencies', SYMBOLS.join(','));

  try {
    const response = await fetch(url.toString(), {
      // Next.js dedupes identical fetches within the same render and caches
      // across requests for `revalidate` seconds.
      next: { revalidate: REVALIDATE_SECONDS, tags: ['metal-prices'] },
    });
    if (!response.ok) {
      console.error('[metalPrice] HTTP', response.status);
      return empty;
    }
    const json = (await response.json()) as MetalPriceApiResponse;
    if (!json.success || !json.rates) {
      console.error('[metalPrice] api error', json.error);
      return empty;
    }

    const toSpot = (sym: Symbol): MetalSpot | null => {
      const rate = json.rates?.[sym];
      if (!rate || rate <= 0) return null;
      // The API returns "1 GBP equals X units of the metal in troy ounces".
      // So 1 troy oz of metal in GBP = 1 / rate, and per gram = that / 31.1.
      const per_ounce_gbp = 1 / rate;
      const per_gram_gbp = per_ounce_gbp / TROY_OUNCE_GRAMS;
      return {
        per_ounce_gbp: Number(per_ounce_gbp.toFixed(2)),
        per_gram_gbp: Number(per_gram_gbp.toFixed(4)),
      };
    };

    return {
      fetched_at: new Date().toISOString(),
      gold: toSpot('XAU'),
      silver: toSpot('XAG'),
      platinum: toSpot('XPT'),
      palladium: toSpot('XPD'),
    };
  } catch (e) {
    console.error('[metalPrice] fetch failed', e);
    return empty;
  }
}

/**
 * Convenience for the calculator: convert a 24ct spot price into the
 * effective £/g at a given purity (e.g. 22ct = 91.6%).
 */
export function spotForPurity(
  perGramPureGBP: number | null | undefined,
  purityPercentage: number,
): number | null {
  if (!perGramPureGBP || !Number.isFinite(perGramPureGBP)) return null;
  return Number(((perGramPureGBP * purityPercentage) / 100).toFixed(4));
}

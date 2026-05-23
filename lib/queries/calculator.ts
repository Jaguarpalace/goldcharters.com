import { getServerSupabase } from '@/lib/supabase/server';
import { mockCalculatorRates } from '@/lib/mock-data';
import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import type { CalculatorRate } from '@/types/database';

/**
 * Fetch calculator rates, applying live-price computation per row where the
 * admin has set a `margin_percentage`. Each row stays manual unless margin
 * is set — so admins can mix-and-match.
 */
export async function getCalculatorRates(): Promise<CalculatorRate[]> {
  const rates = await fetchRowsFromSource();

  // Only fetch spots if at least one row wants live pricing.
  const anyAuto = rates.some((r) => r.margin_percentage !== null && r.margin_percentage > 0);
  if (!anyAuto) return rates;

  const spots = await getMetalSpots();
  // Explicit metal-only key type so TypeScript knows spots[key] is MetalSpot|null,
  // not the broader keyof typeof spots which also includes the fetched_at string.
  type MetalKey = 'gold' | 'silver' | 'platinum' | 'palladium';
  const metalKey: Record<CalculatorRate['metal_type'], MetalKey> = {
    Gold: 'gold',
    Silver: 'silver',
    Platinum: 'platinum',
    Palladium: 'palladium',
  };

  return rates.map((rate) => {
    if (rate.margin_percentage == null || rate.margin_percentage <= 0) return rate;
    const key = metalKey[rate.metal_type];
    const spot = spots[key];
    if (!spot) return rate; // API failed or not configured — fall back to manual price
    const purityPrice = spotForPurity(spot.per_gram_gbp, rate.purity_percentage);
    if (!purityPrice) return rate;
    const computed = Number(((purityPrice * rate.margin_percentage) / 100).toFixed(4));
    return { ...rate, price_per_gram: computed };
  });
}

async function fetchRowsFromSource(): Promise<CalculatorRate[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockCalculatorRates();

  const { data, error } = await supabase
    .from('calculator_rates')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockCalculatorRates();
  return data as CalculatorRate[];
}

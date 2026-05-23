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
  const metalKey: Record<CalculatorRate['metal_type'], keyof typeof spots | 'none'> = {
    Gold: 'gold',
    Silver: 'silver',
    Platinum: 'platinum',
    Palladium: 'palladium',
  };

  return rates.map((rate) => {
    if (rate.margin_percentage == null || rate.margin_percentage <= 0) return rate;
    const key = metalKey[rate.metal_type];
    const spot = key !== 'none' ? spots[key] : null;
    if (!spot) return rate; // API failed — fall back to manual price silently
    const pureGramPrice = spot.per_gram_gbp;
    const purityPrice = spotForPurity(pureGramPrice, rate.purity_percentage);
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

import { getServerSupabase } from '@/lib/supabase/server';
import type { StockItem, StockItemStatus } from '@/types/database';

/** All currently held items, newest acquisition first. Hot path for the dashboard. */
export async function listHeldStockItems(): Promise<StockItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('status', 'held')
    .order('acquired_at', { ascending: false });
  if (error || !data) return [];
  return data as StockItem[];
}

/** Sold items, newest sale first. Filter by date range optional. */
export async function listSoldStockItems(opts?: {
  from?: string;
  to?: string;
}): Promise<StockItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  let q = supabase
    .from('stock_items')
    .select('*')
    .eq('status', 'sold')
    .order('sold_at', { ascending: false });
  if (opts?.from) q = q.gte('sold_at', opts.from);
  if (opts?.to) q = q.lte('sold_at', opts.to);
  const { data, error } = await q;
  if (error || !data) return [];
  return data as StockItem[];
}

/** Full ledger — every row, every status. Used by CSV export. */
export async function listAllStockItems(): Promise<StockItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .order('acquired_at', { ascending: false });
  if (error || !data) return [];
  return data as StockItem[];
}

export async function getStockItem(id: string): Promise<StockItem | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as StockItem;
}

/** Stock items linked to a given customer (drives the KYC Holdings tab). */
export async function getStockItemsForCustomer(customerId: string): Promise<StockItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('customer_id', customerId)
    .order('acquired_at', { ascending: false });
  if (error || !data) return [];
  return data as StockItem[];
}

/** Has this valuation request already been imported into the holdings? */
export async function getStockItemByValuationId(
  valuationRequestId: string,
): Promise<StockItem | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('valuation_request_id', valuationRequestId)
    .maybeSingle();
  if (error || !data) return null;
  return data as StockItem;
}

/* -------------------------------------------------------------- Snapshots */

export type MetalKey = 'gold' | 'silver' | 'platinum' | 'palladium';

export type PortfolioSlice = {
  count: number;
  total_weight_grams: number;
  total_cost_gbp: number;
  total_current_value_gbp: number;
  /** Δ £ (current − cost). Negative when underwater. */
  pl_gbp: number;
  /** Δ % vs cost. */
  pl_pct: number;
};

export type PortfolioSnapshot = {
  combined: PortfolioSlice;
  by_metal: Record<MetalKey, PortfolioSlice>;
  /** Items without a metal_type (handbags, watches) — valued at cost. */
  non_metal: PortfolioSlice;
  /** When the underlying spot was fetched (null when no metal items). */
  spot_fetched_at: string | null;
  /** True when at least one metal spot price was available. */
  spot_available: boolean;
};

const EMPTY_SLICE: PortfolioSlice = {
  count: 0,
  total_weight_grams: 0,
  total_cost_gbp: 0,
  total_current_value_gbp: 0,
  pl_gbp: 0,
  pl_pct: 0,
};

function metalKeyFromName(name: string | null | undefined): MetalKey | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('gold')) return 'gold';
  if (n.includes('silver')) return 'silver';
  if (n.includes('platinum')) return 'platinum';
  if (n.includes('palladium')) return 'palladium';
  return null;
}

/**
 * Compute the live portfolio snapshot for a list of held items, given the
 * current spot prices (per gram, pure metal).
 *
 * Pure function — no I/O, no caching concerns. The caller fetches the items
 * and spots and passes them in.
 */
export function computePortfolioSnapshot(
  items: StockItem[],
  spots: Record<MetalKey, number | null>,
  spotFetchedAt: string | null,
): PortfolioSnapshot {
  const by_metal: Record<MetalKey, PortfolioSlice> = {
    gold: { ...EMPTY_SLICE },
    silver: { ...EMPTY_SLICE },
    platinum: { ...EMPTY_SLICE },
    palladium: { ...EMPTY_SLICE },
  };
  const non_metal: PortfolioSlice = { ...EMPTY_SLICE };
  const combined: PortfolioSlice = { ...EMPTY_SLICE };

  let spot_available = false;

  for (const item of items) {
    const cost = Number(item.acquired_paid_gbp) || 0;
    const weight = Number(item.weight_grams) || 0;
    const purity = Number(item.purity_percentage) || 0;
    const metal = metalKeyFromName(item.metal_type);

    let current_value = cost; // sensible fallback when we can't value it live
    if (metal) {
      const spot = spots[metal];
      if (spot && weight > 0 && purity > 0) {
        current_value = (weight * (purity / 100)) * spot;
        spot_available = true;
      }
    }

    const slice = metal ? by_metal[metal] : non_metal;
    slice.count += 1;
    slice.total_weight_grams += weight;
    slice.total_cost_gbp += cost;
    slice.total_current_value_gbp += current_value;

    combined.count += 1;
    combined.total_weight_grams += weight;
    combined.total_cost_gbp += cost;
    combined.total_current_value_gbp += current_value;
  }

  for (const slice of [combined, non_metal, ...Object.values(by_metal)]) {
    slice.pl_gbp = round2(slice.total_current_value_gbp - slice.total_cost_gbp);
    slice.pl_pct =
      slice.total_cost_gbp > 0 ? round2((slice.pl_gbp / slice.total_cost_gbp) * 100) : 0;
    slice.total_cost_gbp = round2(slice.total_cost_gbp);
    slice.total_current_value_gbp = round2(slice.total_current_value_gbp);
    slice.total_weight_grams = round2(slice.total_weight_grams);
  }

  return {
    combined,
    by_metal,
    non_metal,
    spot_fetched_at: spotFetchedAt,
    spot_available,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ------------------------------------------------------- Status helpers */

export function describeStockStatus(s: StockItemStatus): string {
  switch (s) {
    case 'held':
      return 'In holdings';
    case 'sold':
      return 'Sold';
    case 'written_off':
      return 'Written off';
  }
}

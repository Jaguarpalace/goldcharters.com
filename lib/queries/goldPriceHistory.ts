import 'server-only';

import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { getGoldSpotHistory, getMetalSpots } from '@/lib/services/metalPrice';
import type { CalculatorRate, GoldPriceSnapshot } from '@/types/database';

/** One point on the chart: calendar day (YYYY-MM-DD, London) and £ per gram we pay. */
export type GoldPricePoint = { date: string; price: number };

export type GoldPriceHistory = {
  /** Oldest first. Empty when neither the table nor the API could supply data. */
  points: GoldPricePoint[];
  /** Where the points came from, for the small print under the chart. */
  source: 'snapshots' | 'api' | 'none';
};

const CARATS = [9, 14, 18, 22, 24] as const;
type Carat = (typeof CARATS)[number];

/** Today's date in London as YYYY-MM-DD (en-CA gives ISO order). */
export function londonToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

const findGold = (rates: CalculatorRate[], carat: number) =>
  rates.find(
    (r) => r.metal_type === 'Gold' && new RegExp(`^\\s*${carat}\\s*ct`, 'i').test(r.carat_label),
  );

/**
 * What we pay per gram for each carat today, as the calculator shows it,
 * keyed by carat. Missing rows are null.
 */
function paidByCarat(rates: CalculatorRate[]): Record<Carat, number | null> {
  const out = {} as Record<Carat, number | null>;
  for (const c of CARATS) {
    const r = findGold(rates, c);
    out[c] = r ? r.price_per_gram : null;
  }
  return out;
}

/**
 * Reconstruct what we would have paid on a past day from that day's spot
 * price, using today's ratio of paid rate to spot. Keeps the chart in step
 * with the figure on the page (today's point always equals today's rate).
 */
function reconstruct(
  spotHistory: { date: string; spot: number }[],
  spotToday: number,
  paidToday: Record<Carat, number | null>,
): Omit<GoldPriceSnapshot, 'created_at' | 'updated_at'>[] {
  return spotHistory.map(({ date, spot }) => {
    const row: Omit<GoldPriceSnapshot, 'created_at' | 'updated_at'> = {
      snapshot_date: date,
      spot_gbp_per_gram: Number(spot.toFixed(4)),
      price_9ct: null,
      price_14ct: null,
      price_18ct: null,
      price_22ct: null,
      price_24ct: null,
      source: 'backfill',
    };
    for (const c of CARATS) {
      const paid = paidToday[c];
      if (paid == null) continue;
      row[`price_${c}ct`] = Number(((paid / spotToday) * spot).toFixed(4));
    }
    return row;
  });
}

/**
 * Record today's figures. Called by the daily cron and by the calculator page
 * on render (cheap: one upsert, and the page revalidates once a minute at
 * most). When the table is nearly empty it also backfills ~90 days from the
 * price API, so the chart is full from the first day after the migration.
 *
 * Never throws: a missing table or a failed API call is logged and ignored
 * so the public page always renders.
 */
export async function recordGoldSnapshot(rates: CalculatorRate[]): Promise<void> {
  const admin = getAdminSupabase();
  if (!admin) return;

  try {
    const spots = await getMetalSpots();
    const spot = spots.gold?.per_gram_gbp;
    if (!spot) return;
    const paid = paidByCarat(rates);

    const { error: upsertError } = await admin.from('gold_price_snapshots').upsert(
      {
        snapshot_date: londonToday(),
        spot_gbp_per_gram: spot,
        price_9ct: paid[9],
        price_14ct: paid[14],
        price_18ct: paid[18],
        price_22ct: paid[22],
        price_24ct: paid[24],
        source: 'live',
      },
      { onConflict: 'snapshot_date' },
    );
    if (upsertError) {
      // Most likely migration 039 has not been applied yet.
      console.error('[goldPriceHistory] snapshot upsert failed', upsertError.message);
      return;
    }

    const { count } = await admin
      .from('gold_price_snapshots')
      .select('snapshot_date', { count: 'exact', head: true });
    if ((count ?? 0) >= 30) return;

    const history = await getGoldSpotHistory(92);
    if (history.length === 0) return;
    const rows = reconstruct(history, spot, paid);
    const { error: backfillError } = await admin
      .from('gold_price_snapshots')
      .upsert(rows, { onConflict: 'snapshot_date', ignoreDuplicates: true });
    if (backfillError) {
      console.error('[goldPriceHistory] backfill failed', backfillError.message);
    }
  } catch (e) {
    console.error('[goldPriceHistory] recordGoldSnapshot failed', e);
  }
}

/** One point on the long trend line: calendar day and pure gold £ per gram. */
export type GoldTrendPoint = { date: string; value: number };

/**
 * The gold price per gram in pounds over the last `days` days (default five
 * years), oldest first, for the trend line on the calculator page. Reads the
 * spot column of the snapshot table (backfilled with five years of daily
 * figures on 29 Oct 2026, topped up by the daily cron). Falls back to the
 * price API's last 12 months when the table is thin. Never throws.
 */
export async function getGoldSpotTrend(days = 365 * 5 + 1): Promise<GoldTrendPoint[]> {
  const since = new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA', {
    timeZone: 'Europe/London',
  });
  try {
    const supabase = getServerSupabase();
    if (supabase) {
      // PostgREST caps a single response at 1,000 rows; five years is ~1,825,
      // so page through in order until a short page comes back.
      const PAGE = 1000;
      const rows: { snapshot_date: string; spot_gbp_per_gram: number | null }[] = [];
      for (let from = 0; from < 10 * PAGE; from += PAGE) {
        const { data, error } = await supabase
          .from('gold_price_snapshots')
          .select('snapshot_date, spot_gbp_per_gram')
          .gte('snapshot_date', since)
          .order('snapshot_date', { ascending: true })
          .range(from, from + PAGE - 1);
        if (error || !data) break;
        rows.push(...data);
        if (data.length < PAGE) break;
      }
      if (rows.length >= 60) {
        return rows
          .filter((r) => r.spot_gbp_per_gram != null)
          .map((r) => ({ date: String(r.snapshot_date), value: Number(r.spot_gbp_per_gram) }));
      }
    }
    const history = await getGoldSpotHistory(Math.min(days, 365));
    return history.map(({ date, spot }) => ({ date, value: spot }));
  } catch (e) {
    console.error('[goldPriceHistory] getGoldSpotTrend failed', e);
    return [];
  }
}

/**
 * The last `days` days of what we pay per gram for `carat` gold, oldest
 * first. Reads the snapshot table; when it is missing or thin (before the
 * migration is applied) it falls back to the price API's history scaled by
 * today's paying rate, so the chart still shows.
 */
export async function getGoldPriceHistory(
  rates: CalculatorRate[],
  carat: Carat = 9,
  days = 90,
): Promise<GoldPriceHistory> {
  const column = `price_${carat}ct` as const;
  const since = new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA', {
    timeZone: 'Europe/London',
  });

  const supabase = getServerSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('gold_price_snapshots')
      .select(`snapshot_date, ${column}`)
      .gte('snapshot_date', since)
      .order('snapshot_date', { ascending: true });
    if (!error && data && data.length >= 10) {
      const points = (data as unknown as Record<string, string | number | null>[])
        .filter((r) => r[column] != null)
        .map((r) => ({ date: String(r.snapshot_date), price: Number(r[column]) }));
      if (points.length >= 10) return { points, source: 'snapshots' };
    }
  }

  // Fallback: API history scaled to today's paying rate.
  const spots = await getMetalSpots();
  const spot = spots.gold?.per_gram_gbp;
  const paid = paidByCarat(rates)[carat];
  if (!spot || paid == null) return { points: [], source: 'none' };
  const history = await getGoldSpotHistory(days);
  const points = history.map(({ date, spot: s }) => ({
    date,
    price: Number(((paid / spot) * s).toFixed(4)),
  }));
  return { points, source: points.length ? 'api' : 'none' };
}

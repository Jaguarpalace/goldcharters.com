import { getServerSupabase } from '@/lib/supabase/server';
import type { PaymentMethod, StockItem, ValuationRequest } from '@/types/database';

/**
 * Data layer for /admin/finance. Reporting only - reads the records the
 * trading screens already keep (paid valuation requests = money out, sold
 * stock items = money in) and never writes anything.
 */

/** A purchase for finance purposes: a request with a recorded payment. */
export type FinancePurchase = {
  id: string;
  reference: string;
  seller_name: string;
  seller_email: string;
  paid_at: string;
  amount_gbp: number;
  method: PaymentMethod | null;
  item_count: number;
  summary: string;
};

export type FinanceData = {
  purchases: FinancePurchase[];
  soldItems: StockItem[];
  heldItems: StockItem[];
};

export async function getFinanceData(): Promise<FinanceData> {
  const supabase = getServerSupabase();
  if (!supabase) return { purchases: [], soldItems: [], heldItems: [] };

  const [requestsRes, soldRes, heldRes, lineCountsRes] = await Promise.all([
    supabase
      .from('valuation_requests')
      .select('*')
      .not('payment_amount', 'is', null)
      .is('deleted_at', null)
      .order('paid_at', { ascending: false }),
    supabase
      .from('stock_items')
      .select('*')
      .eq('status', 'sold')
      .is('deleted_at', null)
      .order('sold_at', { ascending: false }),
    supabase
      .from('stock_items')
      .select('*')
      .eq('status', 'held')
      .is('deleted_at', null)
      .order('acquired_at', { ascending: true }),
    supabase.from('purchase_items').select('valuation_request_id'),
  ]);

  const lineCounts = new Map<string, number>();
  for (const row of (lineCountsRes.data ?? []) as Array<{ valuation_request_id: string }>) {
    lineCounts.set(row.valuation_request_id, (lineCounts.get(row.valuation_request_id) ?? 0) + 1);
  }

  const purchases: FinancePurchase[] = ((requestsRes.data ?? []) as ValuationRequest[]).map(
    (r) => ({
      id: r.id,
      reference: r.id.slice(0, 8).toUpperCase(),
      seller_name: `${r.first_name} ${r.last_name}`.trim(),
      seller_email: r.email,
      paid_at: r.paid_at ?? r.updated_at ?? r.created_at,
      amount_gbp: Number(r.payment_amount) || 0,
      method: r.payment_method,
      item_count: lineCounts.get(r.id) ?? 1,
      summary: [r.metal_type, r.carat, r.item_type?.replace(/_/g, ' ')]
        .filter(Boolean)
        .join(' · '),
    }),
  );

  return {
    purchases,
    soldItems: (soldRes.data ?? []) as StockItem[],
    heldItems: (heldRes.data ?? []) as StockItem[],
  };
}

import { getServerSupabase } from '@/lib/supabase/server';
import type { Buyer, Sale, SaleItem } from '@/types/database';

export type SaleRow = Sale & {
  buyer: Buyer | null;
  /** Number of stock items on the invoice. */
  item_count: number;
};

/** Every sale, newest first, with the buyer and a line count for the board. */
export async function listSales(): Promise<SaleRow[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sales')
    .select('*, buyer:buyers(*), sale_items(id)')
    .order('sold_at', { ascending: false });
  if (error || !data) return [];
  return (data as Array<Sale & { buyer: Buyer | null; sale_items: { id: string }[] }>).map(
    ({ sale_items, ...sale }) => ({ ...sale, item_count: sale_items?.length ?? 0 }),
  );
}

export type SaleDetail = Sale & {
  buyer: Buyer | null;
  items: SaleItem[];
};

/** One sale with its buyer and lines - the detail page and the invoice. */
export async function getSale(id: string): Promise<SaleDetail | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('sales')
    .select('*, buyer:buyers(*), items:sale_items(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Sale & { buyer: Buyer | null; items: SaleItem[] };
  row.items = [...(row.items ?? [])].sort((a, b) => a.position - b.position);
  return row;
}

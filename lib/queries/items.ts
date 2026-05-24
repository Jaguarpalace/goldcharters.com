import { getServerSupabase } from '@/lib/supabase/server';
import { mockItemsWeBuy, mockTrustCards } from '@/lib/mock-data';
import type { ItemWeBuy, TrustCard } from '@/types/database';

export async function getItemsWeBuy(
  opts: { includeHidden?: boolean } = {},
): Promise<ItemWeBuy[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const all = mockItemsWeBuy();
    return opts.includeHidden ? all : all.filter((i) => i.visible);
  }

  let query = supabase
    .from('items_we_buy')
    .select('*')
    .order('display_order', { ascending: true });
  if (!opts.includeHidden) query = query.eq('visible', true);

  const { data, error } = await query;
  if (error || !data) return mockItemsWeBuy();
  return data as ItemWeBuy[];
}

export async function getTrustCards(
  opts: { includeHidden?: boolean } = {},
): Promise<TrustCard[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const all = mockTrustCards();
    return opts.includeHidden ? all : all.filter((c) => c.visible);
  }

  let query = supabase
    .from('trust_cards')
    .select('*')
    .order('display_order', { ascending: true });
  if (!opts.includeHidden) query = query.eq('visible', true);

  const { data, error } = await query;
  if (error || !data) return mockTrustCards();
  return data as TrustCard[];
}

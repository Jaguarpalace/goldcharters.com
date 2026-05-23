import { getServerSupabase } from '@/lib/supabase/server';
import { mockItemsWeBuy, mockTrustCards } from '@/lib/mock-data';
import type { ItemWeBuy, TrustCard } from '@/types/database';

export async function getItemsWeBuy(): Promise<ItemWeBuy[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockItemsWeBuy();

  const { data, error } = await supabase
    .from('items_we_buy')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockItemsWeBuy();
  return data as ItemWeBuy[];
}

export async function getTrustCards(): Promise<TrustCard[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockTrustCards();

  const { data, error } = await supabase
    .from('trust_cards')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockTrustCards();
  return data as TrustCard[];
}

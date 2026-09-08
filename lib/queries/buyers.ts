import { getServerSupabase } from '@/lib/supabase/server';
import type { Buyer, Sale } from '@/types/database';

/** All active buyers, alphabetical - the Buyers board. */
export async function listBuyers(): Promise<Buyer[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data as Buyer[];
}

export async function getBuyer(id: string): Promise<Buyer | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error || !data) return null;
  return data as Buyer;
}

/** Every invoice issued to a buyer, newest first (voided ones included, flagged). */
export async function getSalesForBuyer(buyerId: string): Promise<Sale[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('buyer_id', buyerId)
    .order('sold_at', { ascending: false });
  if (error || !data) return [];
  return data as Sale[];
}

export { formatBuyerAddress } from '@/lib/format';

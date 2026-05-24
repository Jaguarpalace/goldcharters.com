import { getServerSupabase } from '@/lib/supabase/server';
import { mockFaqs } from '@/lib/mock-data';
import { BUY_ENABLED } from '@/lib/features';
import type { Faq, FaqCategory } from '@/types/database';

/**
 * FAQ categories that only make sense when the shop is enabled.
 * When BUY_ENABLED is false the public site is buy-from-customers only,
 * so questions about delivery, stock and buying jewellery should never
 * appear on the front-end. They remain editable in the admin so the
 * content survives a future shop re-enable.
 */
const SHOP_ONLY_CATEGORIES = new Set<FaqCategory>([
  'buying_jewellery',
  'delivery',
  'stock_orders',
]);

function filterForBuyMode(faqs: Faq[]): Faq[] {
  if (BUY_ENABLED) return faqs;
  return faqs.filter((f) => !SHOP_ONLY_CATEGORIES.has(f.category));
}

export async function getFaqs(): Promise<Faq[]> {
  const supabase = getServerSupabase();
  if (!supabase) return filterForBuyMode(mockFaqs());

  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return filterForBuyMode(mockFaqs());
  return filterForBuyMode(data as Faq[]);
}

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

export async function getFaqs(
  opts: { includeHidden?: boolean } = {},
): Promise<Faq[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const all = opts.includeHidden ? mockFaqs() : mockFaqs().filter((f) => f.visible);
    return opts.includeHidden ? all : filterForBuyMode(all);
  }

  let query = supabase
    .from('faqs')
    .select('*')
    .order('display_order', { ascending: true });
  if (!opts.includeHidden) query = query.eq('visible', true);

  const { data, error } = await query;
  if (error || !data) return filterForBuyMode(mockFaqs());
  // Admin sees every category (including shop-only ones) so they can manage
  // them; public site filters out shop categories when BUY_ENABLED is false.
  return opts.includeHidden ? (data as Faq[]) : filterForBuyMode(data as Faq[]);
}

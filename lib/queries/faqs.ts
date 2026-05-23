import { getServerSupabase } from '@/lib/supabase/server';
import { mockFaqs } from '@/lib/mock-data';
import type { Faq } from '@/types/database';

export async function getFaqs(): Promise<Faq[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockFaqs();

  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockFaqs();
  return data as Faq[];
}

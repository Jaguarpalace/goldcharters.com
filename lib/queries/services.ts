import { getServerSupabase } from '@/lib/supabase/server';
import { mockServices } from '@/lib/mock-data';
import type { Service } from '@/types/database';

/** Public callers get visible services only; the admin editor passes
 *  `includeHidden: true` so hidden rows are still editable. */
export async function getServices(
  opts: { includeHidden?: boolean } = {},
): Promise<Service[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const all = mockServices();
    return opts.includeHidden ? all : all.filter((s) => s.visible);
  }

  let query = supabase
    .from('services')
    .select('*')
    .order('display_order', { ascending: true });
  if (!opts.includeHidden) query = query.eq('visible', true);

  const { data, error } = await query;
  if (error || !data) return mockServices();
  return data as Service[];
}

import { getServerSupabase } from '@/lib/supabase/server';
import { mockServices } from '@/lib/mock-data';
import type { Service } from '@/types/database';

export async function getServices(): Promise<Service[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockServices();

  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockServices();
  return data as Service[];
}

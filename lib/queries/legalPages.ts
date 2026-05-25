import { getServerSupabase } from '@/lib/supabase/server';
import type { LegalPage } from '@/types/database';

export type LegalSlug = 'terms' | 'privacy' | 'cookies';

/**
 * Format a timestamp into the long-form UK date we show on legal pages,
 * e.g. "23 May 2026". Falls back to the hardcoded string if the input
 * isn't parseable, so the rendered page never shows "Invalid Date".
 */
export function formatLegalDate(iso: string, fallback: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function getLegalPage(slug: LegalSlug): Promise<LegalPage | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('legal_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as LegalPage;
}

export async function listLegalPages(): Promise<LegalPage[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('legal_pages')
    .select('*')
    .order('slug', { ascending: true });
  if (error || !data) return [];
  return data as LegalPage[];
}

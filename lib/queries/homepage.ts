import { getServerSupabase } from '@/lib/supabase/server';
import { mockHomepageSections, mockSiteSettings } from '@/lib/mock-data';
import type { HomepageSection, SiteSettings } from '@/types/database';

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = getServerSupabase();
  if (!supabase) return mockSiteSettings();

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error || !data) return mockSiteSettings();
  return data as SiteSettings;
}

/**
 * Fetch homepage sections.
 *
 * By default returns only visible rows — that's what the public site wants.
 * Pass `includeHidden: true` from the admin editor so unticking the
 * "visible" checkbox doesn't make a section disappear from its own editor.
 */
export async function getHomepageSections(
  opts: { includeHidden?: boolean } = {},
): Promise<HomepageSection[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    const all = mockHomepageSections();
    return opts.includeHidden ? all : all.filter((s) => s.visible);
  }

  let query = supabase
    .from('homepage_sections')
    .select('*')
    .order('display_order', { ascending: true });

  if (!opts.includeHidden) query = query.eq('visible', true);

  const { data, error } = await query;
  if (error || !data) return mockHomepageSections();
  return data as HomepageSection[];
}

export function findHomepageSection(
  sections: HomepageSection[],
  key: string,
): HomepageSection | undefined {
  return sections.find((s) => s.section_key === key);
}

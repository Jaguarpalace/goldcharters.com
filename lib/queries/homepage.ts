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

export async function getHomepageSections(): Promise<HomepageSection[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockHomepageSections();

  const { data, error } = await supabase
    .from('homepage_sections')
    .select('*')
    .eq('visible', true)
    .order('display_order', { ascending: true });

  if (error || !data) return mockHomepageSections();
  return data as HomepageSection[];
}

export function findHomepageSection(
  sections: HomepageSection[],
  key: string,
): HomepageSection | undefined {
  return sections.find((s) => s.section_key === key);
}

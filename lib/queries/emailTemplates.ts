import { getServerSupabase } from '@/lib/supabase/server';
import { mockEmailTemplates } from '@/lib/mock-data';
import type { EmailTemplate } from '@/types/database';

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = getServerSupabase();
  if (!supabase) return mockEmailTemplates();

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('key', { ascending: true });

  if (error || !data) return mockEmailTemplates();
  return data as EmailTemplate[];
}

export async function getEmailTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return mockEmailTemplates().find((t) => t.key === key) ?? null;
  }
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('key', key)
    .maybeSingle();
  if (error || !data) return null;
  return data as EmailTemplate;
}

import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
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

/**
 * Single template lookup used by the transactional email senders.
 *
 * Reads via the admin (service-role) client: the public valuation form
 * runs as an anonymous visitor, and RLS on email_templates hides rows from
 * anon - which made every new-request / customer-confirmation email
 * silently skip as "template missing". The senders are server-only, so the
 * service role never reaches the browser. Falls back to the request-scoped
 * client only when no service key is configured.
 */
export async function getEmailTemplateByKey(key: string): Promise<EmailTemplate | null> {
  const supabase = getAdminSupabase() ?? getServerSupabase();
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

import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import type { NotificationRecipient } from '@/types/database';

/** Full list for the /admin/notifications page (RLS-bound). */
export async function listNotificationRecipients(): Promise<NotificationRecipient[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('notification_recipients')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as NotificationRecipient[];
}

/**
 * Enabled recipient emails, used by the email sender. Reads via the admin
 * (service-role) client so transactional alerts work regardless of who
 * (or what) triggered them.
 */
export async function getEnabledRecipientEmails(): Promise<string[]> {
  const admin = getAdminSupabase();
  if (!admin) return [];
  const { data, error } = await admin
    .from('notification_recipients')
    .select('email')
    .eq('enabled', true);
  if (error || !data) return [];
  return (data as { email: string }[]).map((r) => r.email);
}

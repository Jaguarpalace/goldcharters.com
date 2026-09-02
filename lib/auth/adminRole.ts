import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import type { AdminRole } from '@/lib/actions/_helpers';

/**
 * Admin tiers (display names on the Team page):
 *   'admin'  -> "Full Admin"  - everything
 *   'editor' -> "Manager"     - the trade itself: requests, walk-ins,
 *               payments, holdings, customers, appointments (and their own
 *               Security page). No settings, team, margins, site content,
 *               trash or audit log.
 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Full Admin',
  editor: 'Manager',
};

/** Role of the signed-in admin, or null when not signed in / not an admin. */
export async function getAdminRole(): Promise<AdminRole | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: AdminRole }>();
  return data?.role ?? null;
}

/**
 * Server-component gate for Full Admin-only pages. Managers are sent back
 * to the Overview rather than shown an error wall.
 */
export async function requireFullAdminPage(): Promise<void> {
  const role = await getAdminRole();
  if (role !== 'admin') redirect('/admin');
}

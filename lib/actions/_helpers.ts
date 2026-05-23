import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';

/**
 * Guard used at the top of every admin mutation server action.
 * - Confirms Supabase service-role key is configured (so the admin client can write)
 * - Confirms the request comes from a logged-in user
 * - Confirms that user exists in admin_profiles
 *
 * Returns the admin Supabase client when allowed, or an error string when not.
 */
export async function requireAdminContext() {
  if (!isSupabaseAdminConfigured()) {
    return { error: 'Supabase is not configured on the server.' as const };
  }
  const supabase = getServerSupabase();
  if (!supabase) return { error: 'Server error.' as const };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated.' as const };

  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return { error: 'Not authorised.' as const };

  const admin = getAdminSupabase();
  if (!admin) return { error: 'Server error.' as const };

  return { admin, userId: user.id };
}

export type SaveResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export function sanitiseText(v: FormDataEntryValue | null | undefined, max = 5000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

export function optionalText(v: FormDataEntryValue | null | undefined, max = 5000): string | null {
  const s = sanitiseText(v, max);
  return s ? s : null;
}

export function asBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'on';
}

export function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

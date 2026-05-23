'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase, getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';

async function requireAdmin() {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('admin_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile) return null;
  return user;
}

export type SaveRateResult = { ok: true } | { ok: false; error: string };

export async function updateCalculatorRate(
  id: string,
  patch: {
    price_per_gram?: number;
    margin_percentage?: number | null;
    visible?: boolean;
    admin_notes?: string | null;
    display_order?: number;
  },
): Promise<SaveRateResult> {
  if (!isSupabaseAdminConfigured()) return { ok: false, error: 'Supabase not configured.' };
  const user = await requireAdmin();
  if (!user) return { ok: false, error: 'Not authenticated.' };

  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server error.' };

  const { error } = await admin
    .from('calculator_rates')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[calculator:update]', error);
    return { ok: false, error: error.message };
  }
  revalidatePath('/gold-calculator');
  revalidatePath('/admin/calculator-rates');
  return { ok: true };
}

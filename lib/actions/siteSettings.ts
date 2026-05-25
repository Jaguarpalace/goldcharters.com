'use server';

import { revalidatePath } from 'next/cache';
import { optionalText, requireAdminRole, sanitiseText, type SaveResult } from './_helpers';

export async function updateSiteSettings(id: string, patch: Record<string, unknown>): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const { error } = await ctx.admin
    .from('site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[settings:update]', error);
    return { ok: false, error: error.message };
  }

  // Site settings appear in the layout — every page revalidates.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/contact');
  return { ok: true };
}

export async function updateSiteSettingsFromForm(formData: FormData): Promise<SaveResult> {
  const id = sanitiseText(formData.get('id'), 64);
  if (!id) return { ok: false, error: 'Missing settings id.' };

  return updateSiteSettings(id, {
    business_name: sanitiseText(formData.get('business_name'), 120) || 'Charters Gold',
    logo_url: optionalText(formData.get('logo_url'), 500),
    phone: sanitiseText(formData.get('phone'), 40),
    email: sanitiseText(formData.get('email'), 160),
    whatsapp: optionalText(formData.get('whatsapp'), 40),
    address: optionalText(formData.get('address'), 400),
    opening_hours: optionalText(formData.get('opening_hours'), 200),
    top_bar_review_text: optionalText(formData.get('top_bar_review_text'), 120),
    top_bar_trust_text: optionalText(formData.get('top_bar_trust_text'), 120),
    top_bar_payment_text: optionalText(formData.get('top_bar_payment_text'), 120),
    footer_description: optionalText(formData.get('footer_description'), 800),
    footer_disclaimer: optionalText(formData.get('footer_disclaimer'), 800),
    seo_title: sanitiseText(formData.get('seo_title'), 160) || 'Charters Gold',
    seo_description: sanitiseText(formData.get('seo_description'), 300),
    purchase_disclaimer_text: optionalText(formData.get('purchase_disclaimer_text'), 8000),
  });
}

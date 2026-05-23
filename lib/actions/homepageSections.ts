'use server';

import { revalidatePath } from 'next/cache';
import { asBool, asNumber, optionalText, requireAdminContext, sanitiseText, type SaveResult } from './_helpers';

export type HomepageSectionPatch = {
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  image_url?: string | null;
  display_order?: number;
  visible?: boolean;
  extra?: Record<string, unknown> | null;
};

export async function updateHomepageSection(
  id: string,
  patch: HomepageSectionPatch,
): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin
    .from('homepage_sections')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[homepage:update]', error);
    return { ok: false, error: error.message };
  }

  // Refresh every public page that pulls homepage_sections.
  revalidatePath('/');
  revalidatePath('/sell-gold');
  revalidatePath('/sell-jewellery');
  revalidatePath('/how-it-works');
  revalidatePath('/admin/homepage');
  return { ok: true };
}

/**
 * Form-data variant of updateHomepageSection — used by the admin editor's <form>.
 * Parses fields, including any JSON `extra` payload, then delegates.
 */
export async function updateHomepageSectionFromForm(formData: FormData): Promise<SaveResult> {
  const id = sanitiseText(formData.get('id'), 64);
  if (!id) return { ok: false, error: 'Missing section id.' };

  let extra: Record<string, unknown> | null = null;
  const extraRaw = sanitiseText(formData.get('extra'), 20000);
  if (extraRaw) {
    try {
      extra = JSON.parse(extraRaw);
    } catch {
      return { ok: false, error: 'Extra field is not valid JSON.' };
    }
  }

  return updateHomepageSection(id, {
    title: optionalText(formData.get('title'), 300),
    subtitle: optionalText(formData.get('subtitle'), 300),
    body: optionalText(formData.get('body'), 5000),
    cta_label: optionalText(formData.get('cta_label'), 80),
    cta_href: optionalText(formData.get('cta_href'), 300),
    image_url: optionalText(formData.get('image_url'), 500),
    display_order: asNumber(formData.get('display_order')) ?? 0,
    visible: asBool(formData.get('visible')),
    extra,
  });
}

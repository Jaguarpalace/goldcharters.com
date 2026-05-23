'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import type { Service } from '@/types/database';

const ALLOWED_PATHWAYS = new Set(['sell', 'buy', 'general']);

type UpsertService = {
  id?: string;
  title: string;
  slug: string;
  short_description: string;
  long_description?: string | null;
  icon_key?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  pathway?: string;
  display_order?: number;
  visible?: boolean;
};

function refresh() {
  // Services appear on the homepage and on every sell page.
  revalidatePath('/');
  revalidatePath('/sell-gold');
  revalidatePath('/sell-jewellery');
  revalidatePath('/sell-handbags');
  revalidatePath('/sell-watches');
  revalidatePath('/admin/services');
}

export async function upsertService(input: UpsertService): Promise<SaveResult<Service>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!input.title.trim()) return { ok: false, error: 'Title is required.' };
  if (!input.slug.trim()) return { ok: false, error: 'Slug is required.' };
  if (!input.short_description.trim()) return { ok: false, error: 'Short description is required.' };

  const pathway = input.pathway && ALLOWED_PATHWAYS.has(input.pathway) ? input.pathway : 'sell';

  const row = {
    title: input.title.trim().slice(0, 120),
    slug: input.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80),
    short_description: input.short_description.trim().slice(0, 400),
    long_description: input.long_description?.trim().slice(0, 4000) || null,
    icon_key: input.icon_key || null,
    cta_label: input.cta_label?.trim().slice(0, 80) || null,
    cta_href: input.cta_href?.trim().slice(0, 200) || null,
    pathway,
    display_order: input.display_order ?? 0,
    visible: input.visible ?? true,
  };

  const query = input.id
    ? ctx.admin.from('services').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('services').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) {
    console.error('[services:upsert]', error);
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return { ok: false, error: `A service with slug "${row.slug}" already exists.` };
    }
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, data: data as Service };
}

export async function deleteService(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin.from('services').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

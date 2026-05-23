'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import type { ItemWeBuy } from '@/types/database';

type UpsertItem = {
  id?: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  display_order?: number;
  visible?: boolean;
};

function refresh() {
  revalidatePath('/');
  revalidatePath('/sell-gold');
  revalidatePath('/sell-jewellery');
  revalidatePath('/admin/items-we-buy');
}

export async function upsertItem(input: UpsertItem): Promise<SaveResult<ItemWeBuy>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!input.name.trim()) {
    return { ok: false, error: 'Name is required.' };
  }

  const row = {
    name: input.name.trim().slice(0, 120),
    description: input.description?.trim().slice(0, 600) || null,
    image_url: input.image_url || null,
    display_order: input.display_order ?? 0,
    visible: input.visible ?? true,
  };

  const query = input.id
    ? ctx.admin.from('items_we_buy').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('items_we_buy').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) {
    console.error('[items:upsert]', error);
    // Postgres returns 23505 (unique_violation) when the items_we_buy_name_key
    // constraint blocks a duplicate name. Surface a friendly message.
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      return { ok: false, error: `An item called "${row.name}" already exists.` };
    }
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, data: data as ItemWeBuy };
}

export async function deleteItem(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin.from('items_we_buy').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

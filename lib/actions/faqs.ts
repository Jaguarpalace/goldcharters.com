'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import type { Faq, FaqCategory } from '@/types/database';

const VALID_CATEGORIES = new Set<FaqCategory>([
  'selling_gold',
  'selling_jewellery',
  'calculator',
  'buying_jewellery',
  'delivery',
  'stock_orders',
]);

type UpsertFaq = {
  id?: string;
  category: FaqCategory;
  question: string;
  answer: string;
  display_order?: number;
  visible?: boolean;
};

function refresh() {
  revalidatePath('/');
  revalidatePath('/faqs');
  revalidatePath('/sell-gold');
  revalidatePath('/sell-jewellery');
  revalidatePath('/admin/faqs');
}

export async function upsertFaq(input: UpsertFaq): Promise<SaveResult<Faq>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  if (!VALID_CATEGORIES.has(input.category)) {
    return { ok: false, error: 'Invalid category.' };
  }
  if (!input.question.trim() || !input.answer.trim()) {
    return { ok: false, error: 'Question and answer are required.' };
  }

  const row = {
    category: input.category,
    question: input.question.trim().slice(0, 300),
    answer: input.answer.trim().slice(0, 4000),
    display_order: input.display_order ?? 0,
    visible: input.visible ?? true,
  };

  const query = input.id
    ? ctx.admin.from('faqs').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('faqs').insert(row).select('*').single();

  const { data, error } = await query;
  if (error) {
    console.error('[faqs:upsert]', error);
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true, data: data as Faq };
}

export async function deleteFaq(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin.from('faqs').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

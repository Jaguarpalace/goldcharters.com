'use server';

import { revalidatePath } from 'next/cache';
import { errResult, requireAdminContext, type SaveResult } from './_helpers';
import {
  FORM_OPTION_SET_KEYS,
  type FormOption,
  type FormOptionSetKey,
} from '@/types/database';

function isValidSetKey(s: string): s is FormOptionSetKey {
  return (FORM_OPTION_SET_KEYS as readonly string[]).includes(s);
}

export type UpsertFormOptionInput = {
  id?: string;
  set_key: FormOptionSetKey;
  value: string;
  label: string;
  display_order?: number;
  visible?: boolean;
};

function refresh() {
  // Form options affect every public page that renders the valuation form
  // — bust the layout cache so the new options appear immediately.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/form-options');
}

export async function upsertFormOption(
  input: UpsertFormOptionInput,
): Promise<SaveResult<FormOption>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx as SaveResult<FormOption>;

  if (!isValidSetKey(input.set_key)) {
    return errResult('VALIDATION', 'Unknown option set.');
  }
  const value = input.value.trim();
  const label = input.label.trim();
  if (value.length === 0 || value.length > 80) {
    return errResult('VALIDATION', 'Value must be 1–80 characters.');
  }
  if (label.length === 0 || label.length > 120) {
    return errResult('VALIDATION', 'Label must be 1–120 characters.');
  }

  const row = {
    set_key: input.set_key,
    value,
    label,
    display_order: input.display_order ?? 0,
    visible: input.visible ?? true,
  };

  const query = input.id
    ? ctx.admin.from('form_options').update(row).eq('id', input.id).select('*').single()
    : ctx.admin.from('form_options').insert(row).select('*').single();

  const { data, error } = await query;
  if (error || !data) {
    console.error('[formOptions:upsert]', error);
    if (error?.code === '23505') {
      return errResult(
        'CONFLICT',
        `That value already exists in the ${input.set_key} set.`,
      );
    }
    return errResult('UPSTREAM', error?.message ?? 'Could not save option.');
  }

  refresh();
  return { ok: true, data: data as FormOption };
}

export async function deleteFormOption(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx as SaveResult;

  const { error } = await ctx.admin.from('form_options').delete().eq('id', id);
  if (error) {
    console.error('[formOptions:delete]', error);
    return errResult('UPSTREAM', error.message);
  }
  refresh();
  return { ok: true };
}

export async function setFormOptionVisible(
  id: string,
  visible: boolean,
): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return ctx as SaveResult;

  const { error } = await ctx.admin
    .from('form_options')
    .update({ visible })
    .eq('id', id);
  if (error) {
    console.error('[formOptions:visibility]', error);
    return errResult('UPSTREAM', error.message);
  }
  refresh();
  return { ok: true };
}

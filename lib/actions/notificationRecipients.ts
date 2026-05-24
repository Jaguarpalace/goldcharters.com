'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import type { NotificationRecipient } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addNotificationRecipient(input: {
  email: string;
  label?: string | null;
}): Promise<SaveResult<NotificationRecipient>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const email = input.email.trim().toLowerCase();
  const label = (input.label ?? '').trim().slice(0, 120) || null;

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const { data: existing } = await ctx.admin
    .from('notification_recipients')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: 'That email is already in the list.' };
  }

  const { data, error } = await ctx.admin
    .from('notification_recipients')
    .insert({ email, label, enabled: true })
    .select('*')
    .single<NotificationRecipient>();

  if (error || !data) {
    console.error('[notifications:add]', error);
    return { ok: false, error: error?.message ?? 'Could not add recipient.' };
  }

  revalidatePath('/admin/notifications');
  return { ok: true, data };
}

export async function updateNotificationRecipient(
  id: string,
  patch: { email?: string; label?: string | null; enabled?: boolean },
): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const update: Record<string, unknown> = {};
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return { ok: false, error: 'Please enter a valid email address.' };
    }
    update.email = email;
  }
  if (patch.label !== undefined) {
    update.label = (patch.label ?? '').trim().slice(0, 120) || null;
  }
  if (patch.enabled !== undefined) {
    update.enabled = patch.enabled;
  }
  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await ctx.admin
    .from('notification_recipients')
    .update(update)
    .eq('id', id);

  if (error) {
    console.error('[notifications:update]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/notifications');
  return { ok: true };
}

export async function removeNotificationRecipient(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin
    .from('notification_recipients')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[notifications:remove]', error);
    return { ok: false, error: error.message };
  }

  revalidatePath('/admin/notifications');
  return { ok: true };
}

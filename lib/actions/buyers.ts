'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, requireAdminRole, type SaveResult } from './_helpers';
import { logAdminAction } from './auditLog';
import type { Buyer, BuyerKind } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: string | null | undefined, max = 200): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function refresh(id?: string) {
  revalidatePath('/admin/buyers');
  revalidatePath('/admin/sales');
  if (id) revalidatePath(`/admin/buyers/${id}`);
}

export type BuyerInput = {
  id?: string;
  kind: BuyerKind;
  name: string;
  contact_name?: string | null;
  company_number?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  notes?: string | null;
};

/** Validate + normalise a buyer form. Returns the row or an error string. */
function toRow(input: BuyerInput): { row: Record<string, unknown> } | { error: string } {
  const name = clean(input.name, 160);
  if (!name) return { error: 'Buyer name (or business name) is required.' };
  const kind: BuyerKind = input.kind === 'individual' ? 'individual' : 'business';
  const email = clean(input.email, 200)?.toLowerCase() ?? null;
  if (email && !EMAIL_RE.test(email)) return { error: 'Buyer email looks invalid.' };
  return {
    row: {
      kind,
      name,
      contact_name: clean(input.contact_name, 120),
      company_number: kind === 'business' ? clean(input.company_number, 40) : null,
      vat_number: kind === 'business' ? clean(input.vat_number, 40) : null,
      email,
      phone: clean(input.phone, 40),
      address_line1: clean(input.address_line1, 200),
      address_line2: clean(input.address_line2, 200),
      city: clean(input.city, 100),
      postcode: clean(input.postcode, 20),
      country: clean(input.country, 80),
      notes: clean(input.notes, 4000),
    },
  };
}

/** Create or update a buyer. Used by the Buyers board and inline from the sale form. */
export async function upsertBuyer(input: BuyerInput): Promise<SaveResult<Buyer>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const prepared = toRow(input);
  if ('error' in prepared) return { ok: false, error: prepared.error };

  const query = input.id
    ? ctx.admin.from('buyers').update(prepared.row).eq('id', input.id).select('*').single()
    : ctx.admin.from('buyers').insert(prepared.row).select('*').single();

  const { data, error } = await query;
  if (error || !data) {
    console.error('[buyers:upsert]', error);
    return { ok: false, error: error?.message ?? 'Could not save the buyer.' };
  }
  const buyer = data as Buyer;

  refresh(buyer.id);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'buyer',
    entity_id: buyer.id,
    action: input.id ? 'update' : 'create',
    after: { name: buyer.name, kind: buyer.kind, email: buyer.email },
    note: `${input.id ? 'Updated' : 'Created'} buyer ${buyer.name}`,
  });
  return { ok: true, data: buyer };
}

/**
 * Typeahead behind the sale form: matches the start of any word in the
 * name, the contact name or the email, so "abc" finds "ABC Jewellery Ltd"
 * and "jew" finds it too. At most 8 rows - it is a dropdown, not a report.
 */
export async function searchBuyers(rawQuery: string): Promise<Buyer[]> {
  const query = (rawQuery ?? '').trim();
  if (query.length < 1) return [];
  const ctx = await requireAdminContext();
  if ('error' in ctx) return [];

  const pat = `%${query.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  const { data } = await ctx.admin
    .from('buyers')
    .select('*')
    .or(`name.ilike.${pat},contact_name.ilike.${pat},email.ilike.${pat}`)
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(8);
  return (data ?? []) as Buyer[];
}

/** Soft-delete. Sales already issued keep pointing at the row. */
export async function deleteBuyer(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { error } = await ctx.admin
    .from('buyers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) {
    console.error('[buyers:delete]', error);
    return { ok: false, error: error.message };
  }
  refresh();
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'buyer',
    entity_id: id,
    action: 'delete',
    note: 'Moved buyer to trash',
  });
  return { ok: true };
}

export async function restoreBuyer(id: string): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };
  const { error } = await ctx.admin.from('buyers').update({ deleted_at: null }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  refresh(id);
  return { ok: true };
}

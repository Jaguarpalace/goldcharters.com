'use server';

import { revalidatePath } from 'next/cache';
import type { PurchaseItem } from '@/types/database';
import { requireAdminContext, type SaveResult } from './_helpers';
import { logAdminAction } from './auditLog';
import { createStockItem } from './stockItems';

/**
 * Itemised purchase lines (see migration 030). Each line is one physical
 * piece bought within a purchase, printed line by line on the Purchase
 * Confirmation. All actions are admin-only and fail-soft towards the rest
 * of the request lifecycle - a request with zero lines behaves exactly as
 * it always did.
 */

const clean = (v: string | null | undefined, max: number): string | null => {
  const s = (v ?? '').trim();
  return s ? s.slice(0, max) : null;
};

function refresh(requestId: string) {
  revalidatePath('/admin/valuation-requests');
  revalidatePath(`/admin/valuation-requests/${requestId}/print`);
}

export type PurchaseItemInput = {
  description: string;
  metal_type?: string | null;
  carat?: string | null;
  weight_grams?: number | null;
  hallmark?: string | null;
  price_gbp: number;
};

function validate(input: PurchaseItemInput): string | null {
  if (!clean(input.description, 500)) return 'Each item needs a description.';
  if (!Number.isFinite(input.price_gbp) || input.price_gbp < 0)
    return 'Each item needs a price of £0 or more.';
  if (input.weight_grams != null && (!Number.isFinite(input.weight_grams) || input.weight_grams < 0))
    return 'Weight must be a number of grams.';
  return null;
}

function toRow(requestId: string, input: PurchaseItemInput, position: number) {
  return {
    valuation_request_id: requestId,
    position,
    description: clean(input.description, 500) as string,
    metal_type: clean(input.metal_type, 40),
    carat: clean(input.carat, 20),
    weight_grams: input.weight_grams ?? null,
    hallmark: clean(input.hallmark, 200),
    price_gbp: Number(input.price_gbp.toFixed(2)),
  };
}

export async function listPurchaseItems(requestId: string): Promise<SaveResult<PurchaseItem[]>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { data, error } = await ctx.admin
    .from('purchase_items')
    .select('*')
    .eq('valuation_request_id', requestId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as PurchaseItem[] };
}

export async function addPurchaseItem(
  requestId: string,
  input: PurchaseItemInput,
): Promise<SaveResult<PurchaseItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const { data: last } = await ctx.admin
    .from('purchase_items')
    .select('position')
    .eq('valuation_request_id', requestId)
    .order('position', { ascending: false })
    .limit(1);
  const position = ((last?.[0] as { position: number } | undefined)?.position ?? 0) + 1;

  const { data, error } = await ctx.admin
    .from('purchase_items')
    .insert(toRow(requestId, input, position))
    .select('*')
    .single<PurchaseItem>();
  if (error || !data) {
    console.error('[purchase-items:add]', error);
    return { ok: false, error: error?.message ?? 'Could not add the item.' };
  }

  refresh(requestId);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'valuation_request',
    entity_id: requestId,
    action: 'update',
    after: { line: data.description, price_gbp: data.price_gbp },
    note: `Added purchase line "${data.description}"`,
  });
  return { ok: true, data };
}

export async function updatePurchaseItem(
  itemId: string,
  input: PurchaseItemInput,
): Promise<SaveResult<PurchaseItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const invalid = validate(input);
  if (invalid) return { ok: false, error: invalid };

  const { data, error } = await ctx.admin
    .from('purchase_items')
    .update({
      description: clean(input.description, 500),
      metal_type: clean(input.metal_type, 40),
      carat: clean(input.carat, 20),
      weight_grams: input.weight_grams ?? null,
      hallmark: clean(input.hallmark, 200),
      price_gbp: Number(input.price_gbp.toFixed(2)),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('*')
    .single<PurchaseItem>();
  if (error || !data) {
    console.error('[purchase-items:update]', error);
    return { ok: false, error: error?.message ?? 'Could not update the item.' };
  }
  refresh(data.valuation_request_id);
  return { ok: true, data };
}

export async function deletePurchaseItem(itemId: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { data, error } = await ctx.admin
    .from('purchase_items')
    .delete()
    .eq('id', itemId)
    .select('valuation_request_id, description')
    .single<{ valuation_request_id: string; description: string }>();
  if (error) {
    console.error('[purchase-items:delete]', error);
    return { ok: false, error: error.message };
  }
  if (data) {
    refresh(data.valuation_request_id);
    await logAdminAction({
      admin: ctx.admin,
      actorId: ctx.userId,
      entity_type: 'valuation_request',
      entity_id: data.valuation_request_id,
      action: 'update',
      before: { line: data.description },
      note: `Removed purchase line "${data.description}"`,
    });
  }
  return { ok: true };
}

/**
 * Phase 2: push one purchase line into the holdings ledger as its own
 * stock item. Guarded against double-imports via purchase_items.stock_item_id.
 */
export async function addPurchaseItemToHoldings(
  itemId: string,
): Promise<SaveResult<{ stock_item_id: string }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data: item, error: itemError } = await ctx.admin
    .from('purchase_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle<PurchaseItem>();
  if (itemError || !item) return { ok: false, error: itemError?.message ?? 'Item not found.' };
  if (item.stock_item_id)
    return { ok: false, error: 'This line is already in the holdings ledger.' };

  const { data: vr } = await ctx.admin
    .from('valuation_requests')
    .select('id, email, item_type, paid_at')
    .eq('id', item.valuation_request_id)
    .maybeSingle<{ id: string; email: string | null; item_type: string | null; paid_at: string | null }>();

  let customerId: string | null = null;
  if (vr?.email) {
    const { data: customer } = await ctx.admin
      .from('customers')
      .select('id')
      .ilike('email', vr.email)
      .maybeSingle<{ id: string }>();
    customerId = customer?.id ?? null;
  }

  const created = await createStockItem({
    valuation_request_id: item.valuation_request_id,
    customer_id: customerId,
    item_type: vr?.item_type ?? null,
    description: [item.description, item.hallmark ? `Hallmark/serial: ${item.hallmark}` : null]
      .filter(Boolean)
      .join(' · '),
    metal_type: item.metal_type,
    carat: item.carat,
    purity_percentage: null,
    weight_grams: item.weight_grams,
    acquired_paid_gbp: item.price_gbp,
    acquired_at: vr?.paid_at ?? new Date().toISOString(),
  });
  if (!created.ok || !created.data) {
    return { ok: false, error: !created.ok ? created.error : 'Could not create the holding.' };
  }

  const { error: linkError } = await ctx.admin
    .from('purchase_items')
    .update({ stock_item_id: created.data.id, updated_at: new Date().toISOString() })
    .eq('id', itemId);
  if (linkError) console.error('[purchase-items:link]', linkError);

  refresh(item.valuation_request_id);
  revalidatePath('/admin/holdings');
  return { ok: true, data: { stock_item_id: created.data.id } };
}

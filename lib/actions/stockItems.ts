'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import type { StockItem } from '@/types/database';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------ Helpers --- */

function clean(v: string | null | undefined, max = 200): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function refresh(id?: string) {
  revalidatePath('/admin/holdings');
  if (id) revalidatePath(`/admin/holdings/${id}`);
}

/**
 * Return the cached spot per gram of pure metal for the given metal name
 * snapshot. Null when the metal isn't recognised or spot isn't available.
 */
async function snapshotSpotForMetal(metalType: string | null): Promise<number | null> {
  if (!metalType) return null;
  const m = metalType.toLowerCase();
  const spots = await getMetalSpots();
  if (m.includes('gold')) return spots.gold?.per_gram_gbp ?? null;
  if (m.includes('silver')) return spots.silver?.per_gram_gbp ?? null;
  if (m.includes('platinum')) return spots.platinum?.per_gram_gbp ?? null;
  if (m.includes('palladium')) return spots.palladium?.per_gram_gbp ?? null;
  return null;
}

/* ------------------------------------------------------------- Create --- */

export type CreateStockItemInput = {
  /** Optional source linkage. Either or both may be null (e.g. walk-in). */
  valuation_request_id?: string | null;
  customer_id?: string | null;

  item_type?: string | null;
  description?: string | null;
  metal_type?: string | null;
  carat?: string | null;
  purity_percentage?: number | null;
  weight_grams?: number | null;

  /** Pounds paid to the seller. Required. */
  acquired_paid_gbp: number;
  /**
   * Optional override. When omitted, we stamp the current live spot for the
   * given metal. Pass null explicitly to leave it blank (non-metal items).
   */
  acquired_spot_gbp_per_g?: number | null;
  acquired_at?: string | null;

  notes?: string | null;
};

export async function createStockItem(
  input: CreateStockItemInput,
): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const paid = num(input.acquired_paid_gbp);
  if (paid == null || paid < 0) {
    return { ok: false, error: 'Paid amount is required and must be ≥ 0.' };
  }

  const metalType = clean(input.metal_type, 40);
  // Stamp live spot at the moment of acquisition unless caller provided one.
  // For non-metal items (handbags, watches) the spot stays null.
  const stampedSpot =
    input.acquired_spot_gbp_per_g !== undefined
      ? num(input.acquired_spot_gbp_per_g)
      : await snapshotSpotForMetal(metalType);

  // stock_number is allocated atomically by the DB default — don't set it here.
  const row = {
    valuation_request_id: input.valuation_request_id ?? null,
    customer_id: input.customer_id ?? null,
    item_type: clean(input.item_type, 40),
    description: clean(input.description, 2000),
    metal_type: metalType,
    carat: clean(input.carat, 20),
    purity_percentage: num(input.purity_percentage),
    weight_grams: num(input.weight_grams),
    acquired_at: input.acquired_at || new Date().toISOString(),
    acquired_paid_gbp: paid,
    acquired_spot_gbp_per_g: stampedSpot,
    notes: clean(input.notes, 4000),
  };

  const { data, error } = await ctx.admin
    .from('stock_items')
    .insert(row)
    .select('*')
    .single<StockItem>();

  if (error || !data) {
    console.error('[holdings:create]', error);
    return { ok: false, error: error?.message ?? 'Could not create stock item.' };
  }

  refresh(data.id);
  return { ok: true, data };
}

/* ------------------------------------------------------------- Update --- */

export type UpdateStockItemInput = Partial<{
  item_type: string | null;
  description: string | null;
  metal_type: string | null;
  carat: string | null;
  purity_percentage: number | null;
  weight_grams: number | null;
  acquired_at: string | null;
  acquired_paid_gbp: number;
  acquired_spot_gbp_per_g: number | null;
  notes: string | null;
}>;

export async function updateStockItem(
  id: string,
  patch: UpdateStockItemInput,
): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const update: Record<string, unknown> = {};
  if (patch.item_type !== undefined) update.item_type = clean(patch.item_type, 40);
  if (patch.description !== undefined) update.description = clean(patch.description, 2000);
  if (patch.metal_type !== undefined) update.metal_type = clean(patch.metal_type, 40);
  if (patch.carat !== undefined) update.carat = clean(patch.carat, 20);
  if (patch.purity_percentage !== undefined) update.purity_percentage = num(patch.purity_percentage);
  if (patch.weight_grams !== undefined) update.weight_grams = num(patch.weight_grams);
  if (patch.acquired_at !== undefined) update.acquired_at = patch.acquired_at || null;
  if (patch.acquired_paid_gbp !== undefined) {
    const paid = num(patch.acquired_paid_gbp);
    if (paid == null || paid < 0) {
      return { ok: false, error: 'Paid amount must be ≥ 0.' };
    }
    update.acquired_paid_gbp = paid;
  }
  if (patch.acquired_spot_gbp_per_g !== undefined) {
    update.acquired_spot_gbp_per_g = num(patch.acquired_spot_gbp_per_g);
  }
  if (patch.notes !== undefined) update.notes = clean(patch.notes, 4000);

  if (Object.keys(update).length === 0) {
    // Nothing to update — surface the current row so the client can refresh state.
    const { data } = await ctx.admin.from('stock_items').select('*').eq('id', id).maybeSingle();
    return data ? { ok: true, data: data as StockItem } : { ok: false, error: 'Not found.' };
  }

  const { data, error } = await ctx.admin
    .from('stock_items')
    .update(update)
    .eq('id', id)
    .select('*')
    .single<StockItem>();

  if (error || !data) {
    console.error('[holdings:update]', error);
    return { ok: false, error: error?.message ?? 'Could not update stock item.' };
  }

  refresh(id);
  return { ok: true, data };
}

/* --------------------------------------------------------------- Sale --- */

export type RecordSaleInput = {
  sold_to_name?: string | null;
  sold_to_email?: string | null;
  sold_amount_gbp: number;
  sold_at?: string | null;
  /** Optional override; otherwise current spot for the item's metal is stamped. */
  sold_spot_gbp_per_g?: number | null;
};

export async function recordStockItemSale(
  id: string,
  input: RecordSaleInput,
): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const amount = num(input.sold_amount_gbp);
  if (amount == null || amount < 0) {
    return { ok: false, error: 'Sale amount is required and must be ≥ 0.' };
  }

  const buyerEmail = clean(input.sold_to_email, 200);
  if (buyerEmail && !EMAIL_RE.test(buyerEmail)) {
    return { ok: false, error: 'Buyer email looks invalid.' };
  }

  // Load the row so we know the metal type for the spot stamp.
  const { data: existing, error: readError } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('id', id)
    .maybeSingle<StockItem>();

  if (readError || !existing) {
    return { ok: false, error: readError?.message ?? 'Not found.' };
  }
  if (existing.status === 'sold') {
    return { ok: false, error: 'This item is already marked sold.' };
  }

  const soldSpot =
    input.sold_spot_gbp_per_g !== undefined
      ? num(input.sold_spot_gbp_per_g)
      : await snapshotSpotForMetal(existing.metal_type);

  const { data, error } = await ctx.admin
    .from('stock_items')
    .update({
      status: 'sold',
      sold_at: input.sold_at || new Date().toISOString(),
      sold_to_name: clean(input.sold_to_name, 200),
      sold_to_email: buyerEmail,
      sold_amount_gbp: amount,
      sold_spot_gbp_per_g: soldSpot,
    })
    .eq('id', id)
    .select('*')
    .single<StockItem>();

  if (error || !data) {
    console.error('[holdings:sale]', error);
    return { ok: false, error: error?.message ?? 'Could not record sale.' };
  }

  refresh(id);
  return { ok: true, data };
}

/** Undo a sale — move back to 'held'. Useful for typos. */
export async function unmarkStockItemSale(id: string): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.admin
    .from('stock_items')
    .update({
      status: 'held',
      sold_at: null,
      sold_to_name: null,
      sold_to_email: null,
      sold_amount_gbp: null,
      sold_spot_gbp_per_g: null,
    })
    .eq('id', id)
    .select('*')
    .single<StockItem>();

  if (error || !data) {
    console.error('[holdings:unmark-sale]', error);
    return { ok: false, error: error?.message ?? 'Could not revert sale.' };
  }

  refresh(id);
  return { ok: true, data };
}

/* ------------------------------------------------------------- Delete --- */

export async function deleteStockItem(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin.from('stock_items').delete().eq('id', id);
  if (error) {
    console.error('[holdings:delete]', error);
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

/* --------------------------------------- Import from valuation request --- */

/**
 * One-click import: take a 'bought' valuation request with a payment_amount
 * set and create a stock_items row pre-filled from it. Refuses if the
 * valuation hasn't been paid or has already been imported.
 */
export async function createStockItemFromValuation(
  valuationRequestId: string,
): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // Has this valuation already been imported?
  const { data: existing } = await ctx.admin
    .from('stock_items')
    .select('id')
    .eq('valuation_request_id', valuationRequestId)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: 'This valuation is already in the holdings ledger.' };
  }

  const { data: vr, error: vrError } = await ctx.admin
    .from('valuation_requests')
    .select('*')
    .eq('id', valuationRequestId)
    .maybeSingle();
  if (vrError || !vr) {
    return { ok: false, error: vrError?.message ?? 'Valuation not found.' };
  }

  const paid = num(vr.payment_amount as number | null);
  if (paid == null) {
    return {
      ok: false,
      error: 'This valuation has no payment amount set. Record the payment first.',
    };
  }

  // Map carat strings like '22ct' → purity %.
  const carat = clean(vr.carat as string | null, 20);
  const purity = caratToPurity(carat);

  // Try to find the matching customer by email so the Holdings tab on the
  // KYC page lights up automatically. Not fatal if absent.
  let customerId: string | null = null;
  if (vr.email) {
    const { data: customer } = await ctx.admin
      .from('customers')
      .select('id')
      .ilike('email', vr.email as string)
      .maybeSingle();
    customerId = (customer as { id: string } | null)?.id ?? null;
  }

  return createStockItem({
    valuation_request_id: valuationRequestId,
    customer_id: customerId,
    item_type: vr.item_type as string | null,
    description: composeDescription(vr),
    metal_type: vr.metal_type as string | null,
    carat,
    purity_percentage: purity,
    weight_grams: num(vr.weight_grams as number | null),
    acquired_paid_gbp: paid,
    acquired_at: (vr.paid_at as string | null) ?? new Date().toISOString(),
  });
}

function caratToPurity(carat: string | null): number | null {
  if (!carat) return null;
  const c = carat.toLowerCase().replace(/\s+/g, '');
  if (c.includes('9ct')) return 37.5;
  if (c.includes('14ct')) return 58.5;
  if (c.includes('18ct')) return 75.0;
  if (c.includes('22ct')) return 91.6;
  if (c.includes('24ct')) return 99.9;
  return null;
}

function composeDescription(vr: Record<string, unknown>): string | null {
  const bits = [
    vr.brand,
    vr.model,
    vr.jewellery_type,
    vr.gemstone,
    vr.item_category,
    vr.description,
  ]
    .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    .map((b) => b.trim());
  return bits.length > 0 ? bits.join(' · ').slice(0, 2000) : null;
}

/* --------------------------------------------------- Spot for the page --- */

/**
 * Cached spots ready for the dashboard. Thin re-export so client / server
 * components don't import the service module directly.
 */
export async function getCurrentSpots() {
  return getMetalSpots();
}

export { spotForPurity };

/* ----------------------------------------------------- Export queries --- */

/**
 * Pull acquisitions inside a date range — used by the dashboard's CSV
 * export buttons. Both ends inclusive; pass a far-future `to` for "from
 * now on".
 */
export async function fetchAcquisitionsInRange(
  fromIso: string,
  toIso: string,
): Promise<SaveResult<StockItem[]>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.admin
    .from('stock_items')
    .select('*')
    .gte('acquired_at', fromIso)
    .lte('acquired_at', toIso)
    .order('acquired_at', { ascending: false });

  if (error) {
    console.error('[holdings:export-acquisitions]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as StockItem[] };
}

/** Sales inside a date range — drives the daily/weekly reconciliation CSV. */
export async function fetchSalesInRange(
  fromIso: string,
  toIso: string,
): Promise<SaveResult<StockItem[]>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('status', 'sold')
    .gte('sold_at', fromIso)
    .lte('sold_at', toIso)
    .order('sold_at', { ascending: false });

  if (error) {
    console.error('[holdings:export-sales]', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []) as StockItem[] };
}

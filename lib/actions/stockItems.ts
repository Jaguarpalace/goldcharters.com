'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdminContext, requireAdminRole, type SaveResult } from './_helpers';
import { logAdminAction } from './auditLog';
import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { purityToPercent } from '@/lib/schemas/valuationFormOptions';
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
  revalidatePath('/admin/finance');
  revalidatePath('/admin');
  if (id) revalidatePath(`/admin/holdings/${id}`);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Active (non-trashed) children of a bulk holding, any status. */
async function loadChildren(admin: SupabaseClient, parentId: string): Promise<StockItem[]> {
  const { data } = await admin
    .from('stock_items')
    .select('*')
    .eq('parent_stock_item_id', parentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return (data ?? []) as StockItem[];
}

const sumWeight = (rows: StockItem[]) =>
  rows.reduce((sum, r) => sum + (Number(r.weight_grams) || 0), 0);

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
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'stock_item',
    entity_id: data.id,
    action: 'create',
    after: {
      stock_number: data.stock_number,
      metal_type: data.metal_type,
      carat: data.carat,
      weight_grams: data.weight_grams,
      paid: data.acquired_paid_gbp,
    },
    note: `Created ${data.stock_number}`,
  });
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

  // Weight edits on either side of a split must keep the allocation honest:
  // a piece cannot grow past what its bulk row has left, and a bulk row
  // cannot shrink below what has already been split out of it.
  if (update.weight_grams !== undefined) {
    const { data: current } = await ctx.admin
      .from('stock_items')
      .select('*')
      .eq('id', id)
      .maybeSingle<StockItem>();
    if (current?.parent_stock_item_id) {
      const { data: parent } = await ctx.admin
        .from('stock_items')
        .select('*')
        .eq('id', current.parent_stock_item_id)
        .maybeSingle<StockItem>();
      if (parent) {
        const siblings = (await loadChildren(ctx.admin, parent.id)).filter((c) => c.id !== id);
        const room = (Number(parent.weight_grams) || 0) - sumWeight(siblings);
        const next = Number(update.weight_grams) || 0;
        if (next > room + 0.0005) {
          return {
            ok: false,
            error: `Only ${round3(room)}g of ${parent.stock_number} is left to allocate - this piece cannot be ${next}g.`,
          };
        }
      }
    } else if (current?.status === 'split') {
      const allocated = sumWeight(await loadChildren(ctx.admin, id));
      const next = Number(update.weight_grams) || 0;
      if (next + 0.0005 < allocated) {
        return {
          ok: false,
          error: `${round3(allocated)}g has already been split out of this holding - the weight cannot go below that.`,
        };
      }
    }
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
  if (data.parent_stock_item_id) refresh(data.parent_stock_item_id);
  return { ok: true, data };
}

/* -------------------------------------------------------------- Split --- */

export type SplitLineInput = {
  description: string;
  weight_grams: number;
  item_type?: string | null;
  notes?: string | null;
};

/**
 * Break a bulk holding into individual pieces. Each line becomes its own
 * stock row (own CG number) that inherits the metal, carat, purity, seller,
 * purchase agreement and acquisition date from the bulk row. The bulk row
 * is kept - status 'split' - so the original purchase stays on record.
 *
 * Cost is apportioned by weight: a 15g piece out of a 100g / £3,000 holding
 * carries £450, and its £/g equals the bulk £/g exactly.
 *
 * Refuses to allocate more grams than the bulk row holds. Can be called
 * again on an already-split parent to add further pieces.
 */
export async function splitStockItem(
  parentId: string,
  lines: SplitLineInput[],
): Promise<SaveResult<{ parent: StockItem; children: StockItem[] }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data: parent } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('id', parentId)
    .is('deleted_at', null)
    .maybeSingle<StockItem>();
  if (!parent) return { ok: false, error: 'Holding not found.' };
  if (parent.status !== 'held' && parent.status !== 'split') {
    return { ok: false, error: `A ${parent.status} holding cannot be split.` };
  }
  if (parent.parent_stock_item_id) {
    return { ok: false, error: 'This is already an individual piece from a split.' };
  }
  const parentWeight = Number(parent.weight_grams) || 0;
  if (parentWeight <= 0) {
    return { ok: false, error: 'Set the holding weight before splitting it.' };
  }

  const clean = (lines ?? []).map((l) => ({
    description: (l.description ?? '').trim().slice(0, 500),
    weight_grams: round3(Number(l.weight_grams) || 0),
    item_type: (l.item_type ?? '').trim().slice(0, 40) || null,
    notes: (l.notes ?? '').trim().slice(0, 4000) || null,
  }));
  if (clean.length === 0) return { ok: false, error: 'Add at least one item.' };
  for (const [i, l] of clean.entries()) {
    if (!l.description) return { ok: false, error: `Item ${i + 1} needs a description.` };
    if (!(l.weight_grams > 0)) return { ok: false, error: `Item ${i + 1} needs a weight in grams.` };
  }

  const existing = await loadChildren(ctx.admin, parentId);
  const allocated = sumWeight(existing);
  const adding = sumWeight(clean as unknown as StockItem[]);
  if (allocated + adding > parentWeight + 0.0005) {
    return {
      ok: false,
      error: `That allocates ${round3(allocated + adding)}g but the holding is ${round3(parentWeight)}g - ${round3(allocated + adding - parentWeight)}g over.`,
    };
  }

  const paidPerGram = (Number(parent.acquired_paid_gbp) || 0) / parentWeight;
  const rows = clean.map((l) => ({
    parent_stock_item_id: parent.id,
    valuation_request_id: parent.valuation_request_id,
    customer_id: parent.customer_id,
    item_type: l.item_type ?? parent.item_type,
    description: l.description,
    metal_type: parent.metal_type,
    carat: parent.carat,
    purity_percentage: parent.purity_percentage,
    weight_grams: l.weight_grams,
    acquired_at: parent.acquired_at,
    acquired_paid_gbp: round2(paidPerGram * l.weight_grams),
    acquired_spot_gbp_per_g: parent.acquired_spot_gbp_per_g,
    notes: l.notes,
  }));

  const { data: created, error } = await ctx.admin
    .from('stock_items')
    .insert(rows)
    .select('*');
  if (error || !created) {
    console.error('[holdings:split]', error);
    return { ok: false, error: error?.message ?? 'Could not create the pieces.' };
  }
  const children = created as StockItem[];

  let updatedParent = parent;
  if (parent.status !== 'split') {
    const { data } = await ctx.admin
      .from('stock_items')
      .update({ status: 'split' })
      .eq('id', parent.id)
      .select('*')
      .single<StockItem>();
    if (data) updatedParent = data;
  }

  refresh(parent.id);
  for (const c of children) revalidatePath(`/admin/holdings/${c.id}`);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'stock_item',
    entity_id: parent.id,
    action: 'split',
    after: {
      pieces: children.map((c) => `${c.stock_number} ${c.weight_grams}g`),
      allocated_g: round3(allocated + adding),
      remaining_g: round3(parentWeight - allocated - adding),
    },
    note: `Split ${parent.stock_number}: ${children.map((c) => `${c.stock_number} (${c.weight_grams}g)`).join(', ')}`,
  });
  return { ok: true, data: { parent: updatedParent, children } };
}

/**
 * Edit one piece inside a split. Weight is re-checked against the parent
 * and the apportioned cost is recomputed so £/g stays equal to the bulk.
 */
export async function updateSplitLine(
  childId: string,
  patch: SplitLineInput,
): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data: child } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('id', childId)
    .is('deleted_at', null)
    .maybeSingle<StockItem>();
  if (!child?.parent_stock_item_id) return { ok: false, error: 'Piece not found.' };
  if (child.status === 'sold') return { ok: false, error: 'A sold piece cannot be edited.' };

  const { data: parent } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('id', child.parent_stock_item_id)
    .maybeSingle<StockItem>();
  if (!parent) return { ok: false, error: 'Bulk holding not found.' };

  const description = (patch.description ?? '').trim().slice(0, 500);
  const weight = round3(Number(patch.weight_grams) || 0);
  if (!description) return { ok: false, error: 'The piece needs a description.' };
  if (!(weight > 0)) return { ok: false, error: 'The piece needs a weight in grams.' };

  const parentWeight = Number(parent.weight_grams) || 0;
  const siblings = (await loadChildren(ctx.admin, parent.id)).filter((c) => c.id !== childId);
  const room = parentWeight - sumWeight(siblings);
  if (weight > room + 0.0005) {
    return {
      ok: false,
      error: `Only ${round3(room)}g of ${parent.stock_number} is left - this piece cannot be ${weight}g.`,
    };
  }

  const paidPerGram = parentWeight > 0 ? (Number(parent.acquired_paid_gbp) || 0) / parentWeight : 0;
  const { data, error } = await ctx.admin
    .from('stock_items')
    .update({
      description,
      weight_grams: weight,
      item_type: (patch.item_type ?? '').trim().slice(0, 40) || parent.item_type,
      notes: (patch.notes ?? '').trim().slice(0, 4000) || null,
      acquired_paid_gbp: round2(paidPerGram * weight),
    })
    .eq('id', childId)
    .select('*')
    .single<StockItem>();
  if (error || !data) {
    console.error('[holdings:split:update]', error);
    return { ok: false, error: error?.message ?? 'Could not update the piece.' };
  }
  refresh(childId);
  refresh(parent.id);
  return { ok: true, data };
}

/**
 * Remove one piece from a split (soft delete - it lands in the trash like
 * any other stock row). When it was the last piece the bulk row goes back
 * to 'held' so it can be sold whole or split again from scratch.
 */
export async function removeSplitLine(childId: string): Promise<SaveResult<{ parent_status: string }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data: child } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('id', childId)
    .is('deleted_at', null)
    .maybeSingle<StockItem>();
  if (!child?.parent_stock_item_id) return { ok: false, error: 'Piece not found.' };
  if (child.status === 'sold') {
    return { ok: false, error: 'This piece has been sold - void the sale first.' };
  }

  const { error } = await ctx.admin
    .from('stock_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', childId);
  if (error) return { ok: false, error: error.message };

  const remaining = await loadChildren(ctx.admin, child.parent_stock_item_id);
  let parentStatus = 'split';
  if (remaining.length === 0) {
    await ctx.admin
      .from('stock_items')
      .update({ status: 'held' })
      .eq('id', child.parent_stock_item_id)
      .eq('status', 'split');
    parentStatus = 'held';
  }

  refresh(child.parent_stock_item_id);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'stock_item',
    entity_id: child.parent_stock_item_id,
    action: 'update',
    before: { removed_piece: child.stock_number, weight_grams: child.weight_grams },
    note: `Removed ${child.stock_number} from the split`,
  });
  return { ok: true, data: { parent_status: parentStatus } };
}

/**
 * Undo a split entirely: every unsold piece goes to the trash and the bulk
 * row returns to 'held'. Refused while any piece is sold.
 */
export async function unsplitStockItem(parentId: string): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const children = await loadChildren(ctx.admin, parentId);
  if (children.some((c) => c.status === 'sold')) {
    return { ok: false, error: 'Some pieces have been sold - void those sales before undoing the split.' };
  }
  if (children.length > 0) {
    const { error } = await ctx.admin
      .from('stock_items')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', children.map((c) => c.id));
    if (error) return { ok: false, error: error.message };
  }
  const { data, error } = await ctx.admin
    .from('stock_items')
    .update({ status: 'held' })
    .eq('id', parentId)
    .eq('status', 'split')
    .select('*')
    .single<StockItem>();
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not undo the split.' };

  refresh(parentId);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'stock_item',
    entity_id: parentId,
    action: 'unsplit',
    before: { pieces: children.map((c) => c.stock_number) },
    note: `Undid split of ${data.stock_number} (${children.length} piece${children.length === 1 ? '' : 's'} removed)`,
  });
  return { ok: true, data };
}

/** Pieces of a bulk holding - for the split editor after a save. */
export async function listSplitChildren(parentId: string): Promise<SaveResult<StockItem[]>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  return { ok: true, data: await loadChildren(ctx.admin, parentId) };
}

/** Stock rows created from one purchase agreement - the CG codes it produced. */
export async function listStockForRequest(requestId: string): Promise<SaveResult<StockItem[]>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { data, error } = await ctx.admin
    .from('stock_items')
    .select('*')
    .eq('valuation_request_id', requestId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as StockItem[] };
}

/* --------------------------------------------------------------- Sale --- */

export type RecordSaleInput = {
  sold_to_name?: string | null;
  sold_to_email?: string | null;
  sold_amount_gbp: number;
  sold_at?: string | null;
  /** Optional override; otherwise current spot for the item's metal is stamped. */
  sold_spot_gbp_per_g?: number | null;
  /**
   * When true and the stock item was imported from a valuation request, that
   * source valuation is advanced to status='completed' alongside the sale.
   * Defaults true on the UI when there is a linked valuation. Walk-ins have
   * no valuation_request_id, so this is silently ignored.
   */
  complete_source_valuation?: boolean;
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

  // Optionally close the originating valuation request — best-effort,
  // ledger sale still succeeds if this side-effect fails.
  if (input.complete_source_valuation && existing.valuation_request_id) {
    const { error: vrError } = await ctx.admin
      .from('valuation_requests')
      .update({ status: 'completed' })
      .eq('id', existing.valuation_request_id)
      .neq('status', 'completed');
    if (vrError) {
      console.error('[holdings:sale:complete-valuation]', vrError);
    } else {
      revalidatePath('/admin/valuation-requests');
    }
  }

  if (data) {
    await logAdminAction({
      admin: ctx.admin,
      actorId: ctx.userId,
      entity_type: 'stock_item',
      entity_id: id,
      action: 'record_sale',
      after: {
        sold_to_name: data.sold_to_name,
        sold_amount_gbp: data.sold_amount_gbp,
        sold_at: data.sold_at,
      },
      note: `Sold ${existing.stock_number}${
        data.sold_to_name ? ` to ${data.sold_to_name}` : ''
      } · £${Number(data.sold_amount_gbp ?? 0).toLocaleString('en-GB')}`,
    });
  }

  if (error || !data) {
    console.error('[holdings:sale]', error);
    return { ok: false, error: error?.message ?? 'Could not record sale.' };
  }

  refresh(id);
  return { ok: true, data };
}

/** Undo a legacy sale — move back to 'held'. Useful for typos. */
export async function unmarkStockItemSale(id: string): Promise<SaveResult<StockItem>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // Items sold on an invoice are reverted by voiding the sale, so the
  // invoice and its other lines stay consistent.
  const { data: current } = await ctx.admin
    .from('stock_items')
    .select('sale_id')
    .eq('id', id)
    .maybeSingle<{ sale_id: string | null }>();
  if (current?.sale_id) {
    return {
      ok: false,
      error: 'This item is on an invoice - void the sale from the Sales page to return it to holdings.',
      code: 'CONFLICT',
    };
  }

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

/**
 * Soft-delete: the row is hidden from every dashboard but recoverable
 * from /admin/trash. Stock numbers are NOT reused — a restored item
 * keeps its original CG-NNNNNN.
 */
export async function deleteStockItem(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // Snapshot a couple of identifying fields so the audit log retains a
  // human-readable summary of what was removed.
  const { data: existing } = await ctx.admin
    .from('stock_items')
    .select('stock_number, metal_type, acquired_paid_gbp, status, parent_stock_item_id, sale_id')
    .eq('id', id)
    .maybeSingle<{
      stock_number: string;
      metal_type: string | null;
      acquired_paid_gbp: number;
      status: string;
      parent_stock_item_id: string | null;
      sale_id: string | null;
    }>();

  // A bulk row with pieces split out of it is the pieces' provenance -
  // undo the split first so nothing is orphaned.
  if (existing?.status === 'split') {
    const children = await loadChildren(ctx.admin, id);
    if (children.length > 0) {
      return {
        ok: false,
        error: `${existing.stock_number} has ${children.length} piece${children.length === 1 ? '' : 's'} split from it - undo the split first.`,
      };
    }
  }
  if (existing?.sale_id) {
    return { ok: false, error: 'This item is on an invoice - void the sale first.' };
  }

  const { error } = await ctx.admin
    .from('stock_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);
  if (error) {
    console.error('[holdings:soft-delete]', error);
    return { ok: false, error: error.message };
  }

  // Deleting the last piece of a split hands the bulk row back to 'held'.
  if (existing?.parent_stock_item_id) {
    const siblings = await loadChildren(ctx.admin, existing.parent_stock_item_id);
    if (siblings.length === 0) {
      await ctx.admin
        .from('stock_items')
        .update({ status: 'held' })
        .eq('id', existing.parent_stock_item_id)
        .eq('status', 'split');
    }
    refresh(existing.parent_stock_item_id);
  }
  refresh();
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'stock_item',
    entity_id: id,
    action: 'delete',
    before: existing ?? null,
    note: existing
      ? `Moved ${(existing as { stock_number: string }).stock_number} to trash`
      : 'Moved stock item to trash',
  });
  return { ok: true };
}

/** Restore a soft-deleted stock item. Idempotent. */
export async function restoreStockItem(id: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { error } = await ctx.admin
    .from('stock_items')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) {
    console.error('[holdings:restore]', error);
    return { ok: false, error: error.message };
  }
  refresh();
  return { ok: true };
}

/**
 * Permanently delete a stock item. Refuses to act on rows that haven't
 * been moved to trash first, forcing a deliberate two-step workflow.
 */
export async function purgeStockItem(id: string): Promise<SaveResult> {
  const ctx = await requireAdminRole();
  if ('error' in ctx) return { ok: false, error: ctx.error, code: ctx.code };

  const { data: row } = await ctx.admin
    .from('stock_items')
    .select('id, stock_number, deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (!row) return { ok: true };
  if ((row as { deleted_at: string | null }).deleted_at === null) {
    return {
      ok: false,
      error: 'Move the stock item to trash first before permanent delete.',
    };
  }

  const { error } = await ctx.admin.from('stock_items').delete().eq('id', id);
  if (error) {
    console.error('[holdings:purge]', error);
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

  // Has this valuation already been imported? (limit(1) rather than
  // maybeSingle: itemised purchases can create several holdings per request.)
  const { data: existing } = await ctx.admin
    .from('stock_items')
    .select('id')
    .eq('valuation_request_id', valuationRequestId)
    .limit(1);
  if (existing && existing.length > 0) {
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
  const purity = purityToPercent(carat);

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

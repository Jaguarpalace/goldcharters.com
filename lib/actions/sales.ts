'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminContext, type SaveResult } from './_helpers';
import { logAdminAction } from './auditLog';
import { upsertBuyer, type BuyerInput } from './buyers';
import { getMetalSpots } from '@/lib/services/metalPrice';
import type { Buyer, Sale, StockItem } from '@/types/database';

function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function refresh(saleId?: string, stockIds: string[] = []) {
  revalidatePath('/admin/sales');
  revalidatePath('/admin/holdings');
  revalidatePath('/admin/buyers');
  revalidatePath('/admin/finance');
  revalidatePath('/admin');
  if (saleId) revalidatePath(`/admin/sales/${saleId}`);
  for (const id of stockIds) revalidatePath(`/admin/holdings/${id}`);
}

async function spotForMetal(metalType: string | null): Promise<number | null> {
  if (!metalType) return null;
  const m = metalType.toLowerCase();
  const spots = await getMetalSpots();
  if (m.includes('gold')) return spots.gold?.per_gram_gbp ?? null;
  if (m.includes('silver')) return spots.silver?.per_gram_gbp ?? null;
  if (m.includes('platinum')) return spots.platinum?.per_gram_gbp ?? null;
  if (m.includes('palladium')) return spots.palladium?.per_gram_gbp ?? null;
  return null;
}

export type SaleLineInput = {
  stock_item_id: string;
  price_gbp: number;
};

export type CreateSaleInput = {
  /** Either an existing buyer... */
  buyer_id?: string | null;
  /** ...or a new one created as part of the sale. */
  new_buyer?: BuyerInput | null;
  sold_at?: string | null;
  items: SaleLineInput[];
  notes?: string | null;
  /**
   * When true, source valuation requests of the sold items are moved to
   * 'completed'. Off by default: a purchase agreement covering several
   * pieces is not closed by selling one of them.
   */
  complete_source_valuations?: boolean;
};

/**
 * Record a sale of one or more held stock items to a buyer and issue the
 * invoice. VAT is always 0 on these invoices, so total = subtotal.
 *
 * Writes, in order: buyer (if new), sales row (invoice number allocated by
 * the DB), sale_items snapshot, then each stock row -> sold with the legacy
 * sold_* columns filled too so finance and the CSV exports keep working.
 */
export async function createSale(
  input: CreateSaleInput,
): Promise<SaveResult<{ sale: Sale; buyer: Buyer }>> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  // --- Lines --------------------------------------------------------------
  const lines = (input.items ?? []).filter((l) => l && l.stock_item_id);
  if (lines.length === 0) return { ok: false, error: 'Pick at least one stock item to sell.' };
  const seen = new Set<string>();
  for (const l of lines) {
    if (seen.has(l.stock_item_id)) return { ok: false, error: 'The same item is listed twice.' };
    seen.add(l.stock_item_id);
    const price = num(l.price_gbp);
    if (price == null || price < 0) return { ok: false, error: 'Every item needs a sale price of £0 or more.' };
  }

  const { data: stockRows, error: stockErr } = await ctx.admin
    .from('stock_items')
    .select('*')
    .in('id', lines.map((l) => l.stock_item_id))
    .is('deleted_at', null);
  if (stockErr) return { ok: false, error: stockErr.message };
  const stock = (stockRows ?? []) as StockItem[];
  if (stock.length !== lines.length) {
    return { ok: false, error: 'One of the selected items no longer exists.' };
  }
  for (const s of stock) {
    if (s.status === 'sold') return { ok: false, error: `${s.stock_number} is already sold.` };
    if (s.status === 'split') {
      return {
        ok: false,
        error: `${s.stock_number} has been split into individual pieces - sell those instead.`,
      };
    }
    if (s.status !== 'held') return { ok: false, error: `${s.stock_number} is not in holdings.` };
  }

  // --- Buyer --------------------------------------------------------------
  let buyer: Buyer | null = null;
  if (input.buyer_id) {
    const { data } = await ctx.admin
      .from('buyers')
      .select('*')
      .eq('id', input.buyer_id)
      .is('deleted_at', null)
      .maybeSingle();
    buyer = (data as Buyer | null) ?? null;
    if (!buyer) return { ok: false, error: 'That buyer no longer exists.' };
  } else if (input.new_buyer) {
    const created = await upsertBuyer(input.new_buyer);
    if (!created.ok || !created.data) {
      return { ok: false, error: !created.ok ? created.error : 'Could not create the buyer.' };
    }
    buyer = created.data;
  } else {
    return { ok: false, error: 'Choose who the item was sold to.' };
  }

  // --- Sale ---------------------------------------------------------------
  const soldAt = input.sold_at || new Date().toISOString();
  const subtotal = round2(lines.reduce((sum, l) => sum + (num(l.price_gbp) ?? 0), 0));
  const { data: saleRow, error: saleErr } = await ctx.admin
    .from('sales')
    .insert({
      buyer_id: buyer.id,
      sold_at: soldAt,
      subtotal_gbp: subtotal,
      vat_rate: 0,
      vat_gbp: 0,
      total_gbp: subtotal,
      buyer_snapshot: {
        kind: buyer.kind,
        name: buyer.name,
        contact_name: buyer.contact_name,
        company_number: buyer.company_number,
        vat_number: buyer.vat_number,
        email: buyer.email,
        phone: buyer.phone,
        address_line1: buyer.address_line1,
        address_line2: buyer.address_line2,
        city: buyer.city,
        postcode: buyer.postcode,
        country: buyer.country,
      },
      notes: input.notes?.trim().slice(0, 4000) || null,
      created_by: ctx.userId,
    })
    .select('*')
    .single<Sale>();
  if (saleErr || !saleRow) {
    console.error('[sales:create]', saleErr);
    return { ok: false, error: saleErr?.message ?? 'Could not record the sale.' };
  }

  // --- Lines + stock updates ---------------------------------------------
  const byId = new Map(stock.map((s) => [s.id, s]));
  const saleItems = lines.map((l, idx) => {
    const s = byId.get(l.stock_item_id)!;
    const price = round2(num(l.price_gbp) ?? 0);
    return {
      sale_id: saleRow.id,
      stock_item_id: s.id,
      position: idx + 1,
      stock_number: s.stock_number,
      description:
        [s.description, s.item_type].filter(Boolean).join(' · ') ||
        [s.metal_type, s.carat].filter(Boolean).join(' ') ||
        s.stock_number,
      metal_type: s.metal_type,
      carat: s.carat,
      weight_grams: s.weight_grams,
      quantity: 1,
      unit_price_gbp: price,
      line_total_gbp: price,
    };
  });
  const { error: linesErr } = await ctx.admin.from('sale_items').insert(saleItems);
  if (linesErr) {
    console.error('[sales:lines]', linesErr);
    // Roll the sale back rather than leave an invoice with no lines.
    await ctx.admin.from('sales').delete().eq('id', saleRow.id);
    return { ok: false, error: linesErr.message };
  }

  const spotCache = new Map<string, number | null>();
  for (const line of saleItems) {
    const s = byId.get(line.stock_item_id)!;
    const key = s.metal_type ?? '';
    if (!spotCache.has(key)) spotCache.set(key, await spotForMetal(s.metal_type));
    const { error: updErr } = await ctx.admin
      .from('stock_items')
      .update({
        status: 'sold',
        sold_at: soldAt,
        sold_to_name: buyer.name,
        sold_to_email: buyer.email,
        sold_amount_gbp: line.unit_price_gbp,
        sold_spot_gbp_per_g: spotCache.get(key) ?? null,
        sale_id: saleRow.id,
      })
      .eq('id', s.id);
    if (updErr) console.error('[sales:stock-update]', updErr);
  }

  if (input.complete_source_valuations) {
    const requestIds = [...new Set(stock.map((s) => s.valuation_request_id).filter(Boolean))];
    if (requestIds.length > 0) {
      await ctx.admin
        .from('valuation_requests')
        .update({ status: 'completed' })
        .in('id', requestIds as string[])
        .neq('status', 'completed');
      revalidatePath('/admin/valuation-requests');
    }
  }

  refresh(saleRow.id, stock.map((s) => s.id));
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'sale',
    entity_id: saleRow.id,
    action: 'record_sale',
    after: {
      invoice_number: saleRow.invoice_number,
      buyer: buyer.name,
      items: saleItems.map((l) => l.stock_number),
      total_gbp: saleRow.total_gbp,
    },
    note: `${saleRow.invoice_number}: sold ${saleItems.map((l) => l.stock_number).join(', ')} to ${buyer.name} · £${Number(saleRow.total_gbp).toLocaleString('en-GB')}`,
  });
  return { ok: true, data: { sale: saleRow, buyer } };
}

/**
 * Void a sale: the invoice number is kept (never reused) and the row stays
 * for the audit trail, but every item on it goes back to 'held'.
 */
export async function voidSale(saleId: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };

  const { data: sale } = await ctx.admin
    .from('sales')
    .select('id, invoice_number, voided_at')
    .eq('id', saleId)
    .maybeSingle<{ id: string; invoice_number: string; voided_at: string | null }>();
  if (!sale) return { ok: false, error: 'Sale not found.' };
  if (sale.voided_at) return { ok: false, error: 'This sale is already voided.' };

  const { data: items } = await ctx.admin
    .from('stock_items')
    .select('id')
    .eq('sale_id', saleId);
  const stockIds = ((items ?? []) as { id: string }[]).map((i) => i.id);

  if (stockIds.length > 0) {
    const { error: revertErr } = await ctx.admin
      .from('stock_items')
      .update({
        status: 'held',
        sold_at: null,
        sold_to_name: null,
        sold_to_email: null,
        sold_amount_gbp: null,
        sold_spot_gbp_per_g: null,
        sale_id: null,
      })
      .in('id', stockIds);
    if (revertErr) {
      console.error('[sales:void:stock]', revertErr);
      return { ok: false, error: revertErr.message };
    }
  }

  const { error } = await ctx.admin
    .from('sales')
    .update({ voided_at: new Date().toISOString() })
    .eq('id', saleId);
  if (error) {
    console.error('[sales:void]', error);
    return { ok: false, error: error.message };
  }

  refresh(saleId, stockIds);
  await logAdminAction({
    admin: ctx.admin,
    actorId: ctx.userId,
    entity_type: 'sale',
    entity_id: saleId,
    action: 'void_sale',
    note: `Voided ${sale.invoice_number} - ${stockIds.length} item${stockIds.length === 1 ? '' : 's'} returned to holdings`,
  });
  return { ok: true };
}

export async function updateSaleNotes(saleId: string, notes: string): Promise<SaveResult> {
  const ctx = await requireAdminContext();
  if ('error' in ctx) return { ok: false, error: ctx.error };
  const { error } = await ctx.admin
    .from('sales')
    .update({ notes: notes.trim().slice(0, 4000) || null })
    .eq('id', saleId);
  if (error) return { ok: false, error: error.message };
  refresh(saleId);
  return { ok: true };
}

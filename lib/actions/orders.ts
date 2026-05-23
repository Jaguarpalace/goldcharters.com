'use server';

import { revalidatePath } from 'next/cache';
import { getAdminSupabase } from '@/lib/supabase/server';
import { isSupabaseAdminConfigured } from '@/lib/supabase/env';
import type { CartItem } from '@/types/cart';

export type CheckoutResult =
  | { ok: true; orderId: string; persisted: boolean }
  | { ok: false; error: string };

function sanitise(v: FormDataEntryValue | null, max = 200) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

export async function placeOrder(formData: FormData, items: CartItem[]): Promise<CheckoutResult> {
  if (items.length === 0) return { ok: false, error: 'Your basket is empty.' };

  const customer_name = sanitise(formData.get('customer_name'), 120);
  const customer_email = sanitise(formData.get('customer_email'), 160);
  const customer_phone = sanitise(formData.get('customer_phone'), 40);
  const billing_address = sanitise(formData.get('billing_address'), 500);
  const delivery_address = sanitise(formData.get('delivery_address'), 500) || billing_address;
  const delivery_method = sanitise(formData.get('delivery_method'), 60) || 'Tracked & Signed (UK)';
  const notes = sanitise(formData.get('notes'), 1000);

  if (!customer_name || !customer_email || !customer_phone)
    return { ok: false, error: 'Please complete your contact details.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email))
    return { ok: false, error: 'Please provide a valid email address.' };
  if (!billing_address) return { ok: false, error: 'Please provide a billing address.' };

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const delivery_fee = subtotal >= 500 ? 0 : 25;
  const total = subtotal + delivery_fee;

  if (!isSupabaseAdminConfigured()) {
    const mockId = `order-mock-${Date.now()}`;
    console.info('[order:mock-mode]', { mockId, items: items.length, total });
    return { ok: true, orderId: mockId, persisted: false };
  }

  const admin = getAdminSupabase();
  if (!admin) return { ok: false, error: 'Server is not configured for orders.' };

  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({
      customer_name,
      customer_email,
      customer_phone,
      billing_address,
      delivery_address,
      delivery_method,
      subtotal,
      delivery_fee,
      total,
      payment_status: 'pending',
      order_status: 'pending',
      notes: notes || null,
    })
    .select('id')
    .single();

  if (orderErr || !order) {
    console.error('[order:insert]', orderErr);
    return { ok: false, error: 'Could not create your order. Please try again.' };
  }

  const itemRows = items.map((i) => ({
    order_id: order.id,
    product_id: i.productId,
    product_title: i.title,
    product_sku: i.sku,
    quantity: i.quantity,
    unit_price: i.unitPrice,
    total_price: i.unitPrice * i.quantity,
  }));

  const { error: itemErr } = await admin.from('order_items').insert(itemRows);
  if (itemErr) console.error('[order:items]', itemErr);

  // Reserve one-off items so they cannot be re-purchased while payment is pending.
  for (const item of items) {
    if (item.maxQuantity <= 1) {
      await admin
        .from('products')
        .update({ status: 'reserved' })
        .eq('id', item.productId)
        .eq('status', 'active');

      await admin.from('stock_movements').insert({
        product_id: item.productId,
        movement_type: 'reserved',
        quantity_change: 0,
        reason: `Reserved for order ${order.id}`,
        created_by: 'system',
      });
    }
  }

  revalidatePath('/admin/orders');
  return { ok: true, orderId: order.id, persisted: true };
}

import { getServerSupabase } from '@/lib/supabase/server';
import type { Order } from '@/types/database';
import { formatGBP } from '@/lib/format';
import { ShopDisabledBanner } from '@/components/admin/ShopDisabledBanner';
import { BUY_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const supabase = getServerSupabase();
  let orders: Order[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    orders = (data ?? []) as Order[];
  }

  return (
    <div className="space-y-8">
      {!BUY_ENABLED && <ShopDisabledBanner />}
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Shop</span>
        <h1 className="font-display text-2xl text-white mt-2">Orders</h1>
        <p className="mt-2 text-sm text-warmgrey">
          Customer orders from the public shop. Connect Supabase to populate this view.
        </p>
      </header>

      <div className="overflow-hidden rounded-xl border border-gold-metallic/15">
        <table className="min-w-full divide-y divide-gold-metallic/10 text-sm">
          <thead className="bg-ink-900/80 text-left text-[11px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Order Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-warmgrey">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-ink-900/40">
                  <td className="px-4 py-3 text-warmgrey">
                    {new Date(o.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{o.customer_name}</p>
                    <p className="text-xs text-warmgrey">{o.customer_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gold-tint">{o.order_status}</td>
                  <td className="px-4 py-3 text-warmgrey">{o.payment_status}</td>
                  <td className="px-4 py-3 text-right text-white">{formatGBP(o.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

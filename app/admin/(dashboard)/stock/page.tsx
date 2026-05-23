import { getServerSupabase } from '@/lib/supabase/server';
import { ShopDisabledBanner } from '@/components/admin/ShopDisabledBanner';
import { BUY_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

type Movement = {
  id: string;
  product_id: string;
  movement_type: string;
  quantity_change: number;
  reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export default async function StockMovementsPage() {
  const supabase = getServerSupabase();
  let movements: Movement[] = [];
  if (supabase) {
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    movements = (data ?? []) as Movement[];
  }

  return (
    <div className="space-y-8">
      {!BUY_ENABLED && <ShopDisabledBanner />}
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Audit</span>
        <h1 className="font-display text-4xl text-white mt-2">Stock Movements</h1>
        <p className="mt-2 text-sm text-warmgrey">Recent inventory activity from the products module.</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-gold-metallic/15">
        <table className="min-w-full divide-y divide-gold-metallic/10 text-sm">
          <thead className="bg-ink-900/80 text-left text-[11px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Movement</th>
              <th className="px-4 py-3">Qty Δ</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-warmgrey">
                  No stock movements yet.
                </td>
              </tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-ink-900/40">
                  <td className="px-4 py-3 text-warmgrey">
                    {new Date(m.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white">{m.product_id}</td>
                  <td className="px-4 py-3 text-gold-tint">{m.movement_type}</td>
                  <td className="px-4 py-3 text-white">{m.quantity_change}</td>
                  <td className="px-4 py-3 text-warmgrey">{m.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-warmgrey">{m.created_by ?? 'system'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

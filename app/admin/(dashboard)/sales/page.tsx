import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listSales } from '@/lib/queries/sales';
import { SalesBoard } from './SalesBoard';

export const dynamic = 'force-dynamic';

export default async function AdminSalesPage() {
  const sales = isSupabaseConfigured() ? await listSales() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Sales</span>
        <h1 className="mt-1 font-display text-2xl text-white">Sales &amp; Invoices</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Every sale of stock, one invoice each. Start a sale from the Holdings page: select the
          items, mark them sold, pick the buyer. The invoice is issued on save and stays linked
          to the buyer and to every CG stock code on it.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view sales.
        </div>
      )}

      <SalesBoard initialSales={sales} />
    </div>
  );
}

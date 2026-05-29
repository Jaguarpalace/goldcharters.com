import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listDeletedCustomers } from '@/lib/queries/customers';
import { listDeletedStockItems } from '@/lib/queries/stockItems';
import { listDeletedValuationRequests } from '@/lib/actions/valuationRequests';
import { TrashBoard } from './TrashBoard';

export const dynamic = 'force-dynamic';

export default async function AdminTrashPage() {
  const [customers, stockItems, valuationRequests] = isSupabaseConfigured()
    ? await Promise.all([
        listDeletedCustomers(),
        listDeletedStockItems(),
        listDeletedValuationRequests(),
      ])
    : [[], [], []];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Recovery</span>
        <h1 className="mt-1 font-display text-2xl text-white">Trash</h1>
        <p className="mt-1 max-w-3xl text-xs text-warmgrey">
          Recently soft-deleted customers, holdings ledger rows and valuation requests. Restore
          to put a row back exactly where it was, or permanently delete to release the storage
          and remove all trace. Permanent delete is irreversible - there is no second trash.
        </p>
      </header>

      <TrashBoard
        customers={customers}
        stockItems={stockItems}
        valuationRequests={valuationRequests}
      />
    </div>
  );
}

import { isSupabaseConfigured } from '@/lib/supabase/env';
import { requireFullAdminPage } from '@/lib/auth/adminRole';
import { getFinanceData } from '@/lib/queries/finance';
import { FinanceBoard } from './FinanceBoard';

export const dynamic = 'force-dynamic';

/**
 * Finance - reporting and exports over the records the trading screens
 * already keep. Full Admin only. Reads, never writes; Sage stays the
 * system of record for accounting proper.
 */
export default async function AdminFinancePage() {
  await requireFullAdminPage();

  const data = isSupabaseConfigured()
    ? await getFinanceData()
    : { purchases: [], soldItems: [], heldItems: [] };

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Reports</span>
        <h1 className="mt-1 font-display text-2xl text-white">Finance</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Purchases, sales and realised profit, month by month - with the purchase-document
          register and CSV exports for the accountant. Figures come straight from recorded
          payments and sales; nothing here edits the books.
        </p>
      </header>
      <FinanceBoard data={data} />
    </div>
  );
}

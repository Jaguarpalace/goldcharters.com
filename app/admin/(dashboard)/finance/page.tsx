import { isSupabaseConfigured } from '@/lib/supabase/env';
import { requireFullAdminPage } from '@/lib/auth/adminRole';
import { getFinanceData } from '@/lib/queries/finance';
import { getMetalSpots } from '@/lib/services/metalPrice';
import { computePortfolioSnapshot, type MetalKey } from '@/lib/queries/stockItems';
import { FinanceBoard } from './FinanceBoard';

export const dynamic = 'force-dynamic';

/**
 * Finance - reporting and exports over the records the trading screens
 * already keep. Full Admin only. Reads, never writes; Sage stays the
 * system of record for accounting proper.
 */
export default async function AdminFinancePage() {
  await requireFullAdminPage();

  const [data, spots] = await Promise.all([
    isSupabaseConfigured()
      ? getFinanceData()
      : Promise.resolve({ purchases: [], soldItems: [], heldItems: [] }),
    getMetalSpots(),
  ]);

  // Live value of held stock: metals at spot x purity x weight, everything
  // else (bags, watches) at the price we paid - same maths as the Overview.
  const spotMap: Record<MetalKey, number | null> = {
    gold: spots.gold?.per_gram_gbp ?? null,
    silver: spots.silver?.per_gram_gbp ?? null,
    platinum: spots.platinum?.per_gram_gbp ?? null,
    palladium: spots.palladium?.per_gram_gbp ?? null,
  };
  const snapshot = computePortfolioSnapshot(data.heldItems, spotMap, spots.fetched_at);

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Reports</span>
        <h1 className="mt-1 font-display text-2xl text-white">Finance</h1>
      </header>
      <FinanceBoard
        data={data}
        stockValue={{
          current: snapshot.combined.total_current_value_gbp,
          plGbp: snapshot.combined.pl_gbp,
          spotAvailable: snapshot.spot_available,
        }}
      />
    </div>
  );
}

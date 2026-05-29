import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getMetalSpots } from '@/lib/services/metalPrice';
import {
  computePortfolioSnapshot,
  listHeldStockItems,
  type MetalKey,
} from '@/lib/queries/stockItems';
import { SpotStaleBanner } from '../_components/SpotStaleBanner';
import { HoldingsBoard } from './HoldingsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminHoldingsPage() {
  // Both calls are independently cached upstream (Supabase + metalPrice fetch
  // cache with 1h revalidate), so this stays fast even on every page load.
  const [items, spots] = await Promise.all([
    isSupabaseConfigured() ? listHeldStockItems() : Promise.resolve([]),
    getMetalSpots(),
  ]);

  const spotMap: Record<MetalKey, number | null> = {
    gold: spots.gold?.per_gram_gbp ?? null,
    silver: spots.silver?.per_gram_gbp ?? null,
    platinum: spots.platinum?.per_gram_gbp ?? null,
    palladium: spots.palladium?.per_gram_gbp ?? null,
  };

  const snapshot = computePortfolioSnapshot(items, spotMap, spots.fetched_at);

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Inventory</span>
        <h1 className="mt-1 font-display text-2xl text-white">Holdings</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Live portfolio of every piece we currently own. Cost basis is locked at purchase; the
          current value column revalues against the live spot price on each load.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view real holdings. Preview mode does not persist edits.
        </div>
      )}

      <SpotStaleBanner snapshot={spots} />

      <HoldingsBoard
        initialItems={items}
        snapshot={snapshot}
        spotMap={spotMap}
      />
    </div>
  );
}

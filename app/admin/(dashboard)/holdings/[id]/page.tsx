import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHoldingTrace, getStockItem } from '@/lib/queries/stockItems';
import { getMetalSpots } from '@/lib/services/metalPrice';
import { HoldingDetail } from './HoldingDetail';
import type { MetalKey } from '@/lib/queries/stockItems';

export const dynamic = 'force-dynamic';

export default async function AdminHoldingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { mode?: string };
}) {
  const item = await getStockItem(params.id);
  if (!item) notFound();

  const [trace, spots] = await Promise.all([getHoldingTrace(item), getMetalSpots()]);

  const spotMap: Record<MetalKey, number | null> = {
    gold: spots.gold?.per_gram_gbp ?? null,
    silver: spots.silver?.per_gram_gbp ?? null,
    platinum: spots.platinum?.per_gram_gbp ?? null,
    palladium: spots.palladium?.per_gram_gbp ?? null,
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-luxe text-gold-metallic">
          <Link href="/admin/holdings" className="hover:text-gold-bright">
            ← Holdings
          </Link>
          {trace.parent && (
            <>
              <span className="text-warmgrey/50">/</span>
              <Link href={`/admin/holdings/${trace.parent.id}`} className="font-mono hover:text-gold-bright">
                {trace.parent.stock_number}
              </Link>
            </>
          )}
        </div>
        <h1 className="mt-2 font-mono text-2xl text-white">{item.stock_number}</h1>
        <p className="mt-1 text-xs text-warmgrey">
          {[item.metal_type, item.carat, item.item_type].filter(Boolean).join(' · ') || 'Stock item'}
          {item.status === 'sold' && (
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-emerald-300">
              Sold
            </span>
          )}
          {item.status === 'split' && (
            <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-violet-300">
              Bulk · split into {trace.children.length} piece{trace.children.length === 1 ? '' : 's'}
            </span>
          )}
          {item.parent_stock_item_id && (
            <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-violet-300">
              Piece of a bulk purchase
            </span>
          )}
          {item.status === 'written_off' && (
            <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-red-300">
              Written off
            </span>
          )}
        </p>
      </header>

      <HoldingDetail
        item={item}
        trace={trace}
        spotMap={spotMap}
        startInSplitMode={searchParams?.mode === 'split'}
      />
    </div>
  );
}

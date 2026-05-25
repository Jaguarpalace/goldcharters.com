import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getStockItem } from '@/lib/queries/stockItems';
import { getCustomer } from '@/lib/queries/customers';
import { getMetalSpots } from '@/lib/services/metalPrice';
import { HoldingDetail } from './HoldingDetail';
import type { MetalKey } from '@/lib/queries/stockItems';

export const dynamic = 'force-dynamic';

export default async function AdminHoldingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const item = await getStockItem(params.id);
  if (!item) notFound();

  const [customer, spots] = await Promise.all([
    item.customer_id ? getCustomer(item.customer_id) : Promise.resolve(null),
    getMetalSpots(),
  ]);

  const spotMap: Record<MetalKey, number | null> = {
    gold: spots.gold?.per_gram_gbp ?? null,
    silver: spots.silver?.per_gram_gbp ?? null,
    platinum: spots.platinum?.per_gram_gbp ?? null,
    palladium: spots.palladium?.per_gram_gbp ?? null,
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-gold-metallic">
          <Link href="/admin/holdings" className="hover:text-gold-bright">
            ← Holdings
          </Link>
        </div>
        <h1 className="mt-2 font-mono text-2xl text-white">{item.stock_number}</h1>
        <p className="mt-1 text-xs text-warmgrey">
          {[item.metal_type, item.carat, item.item_type].filter(Boolean).join(' · ') || 'Stock item'}
          {item.status === 'sold' && (
            <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-emerald-300">
              Sold
            </span>
          )}
          {item.status === 'written_off' && (
            <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-red-300">
              Written off
            </span>
          )}
        </p>
      </header>

      <HoldingDetail item={item} customer={customer} spotMap={spotMap} />
    </div>
  );
}

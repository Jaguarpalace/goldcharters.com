import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBuyer, getSalesForBuyer } from '@/lib/queries/buyers';
import { BuyerDetail } from './BuyerDetail';

export const dynamic = 'force-dynamic';

export default async function AdminBuyerDetailPage({ params }: { params: { id: string } }) {
  const buyer = await getBuyer(params.id);
  if (!buyer) notFound();
  const sales = await getSalesForBuyer(buyer.id);

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-gold-metallic">
          <Link href="/admin/buyers" className="hover:text-gold-bright">
            ← Buyers
          </Link>
        </div>
        <h1 className="mt-2 font-display text-2xl text-white">{buyer.name}</h1>
        <p className="mt-1 text-xs text-warmgrey">
          {buyer.kind === 'business' ? 'Business' : 'Individual'}
          {buyer.contact_name && <> · {buyer.contact_name}</>}
          {buyer.email && <> · {buyer.email}</>}
        </p>
      </header>

      <BuyerDetail buyer={buyer} sales={sales} />
    </div>
  );
}

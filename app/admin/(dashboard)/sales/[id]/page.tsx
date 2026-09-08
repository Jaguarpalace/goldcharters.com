import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSale } from '@/lib/queries/sales';
import { SaleDetail } from './SaleDetail';

export const dynamic = 'force-dynamic';

export default async function AdminSaleDetailPage({ params }: { params: { id: string } }) {
  const sale = await getSale(params.id);
  if (!sale) notFound();

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-gold-metallic">
          <Link href="/admin/sales" className="hover:text-gold-bright">
            ← Sales &amp; Invoices
          </Link>
        </div>
        <h1 className="mt-2 font-mono text-2xl text-white">
          {sale.invoice_number}
          {sale.voided_at && (
            <span className="ml-3 rounded-full bg-red-500/15 px-2 py-0.5 align-middle font-sans text-[10px] font-semibold uppercase tracking-luxe text-red-300">
              Voided
            </span>
          )}
        </h1>
        <p className="mt-1 text-xs text-warmgrey">
          {new Date(sale.sold_at).toLocaleString('en-GB')}
          {sale.buyer && <> · {sale.buyer.name}</>}
        </p>
      </header>

      <SaleDetail sale={sale} />
    </div>
  );
}

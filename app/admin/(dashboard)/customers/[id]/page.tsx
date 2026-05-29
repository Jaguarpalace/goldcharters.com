import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getCustomer,
  getCustomerDocuments,
  getCustomerHistory,
} from '@/lib/queries/customers';
import { getStockItemsForCustomer } from '@/lib/queries/stockItems';
import { CustomerDetail } from './CustomerDetail';

export const dynamic = 'force-dynamic';

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const [documents, history, holdings] = await Promise.all([
    getCustomerDocuments(customer.id),
    getCustomerHistory(customer.email),
    getStockItemsForCustomer(customer.id),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-gold-metallic">
          <Link href="/admin/customers" className="hover:text-gold-bright">
            ← Customers
          </Link>
        </div>
        <h1 className="mt-2 font-display text-2xl text-white">
          {customer.first_name} {customer.last_name}
        </h1>
        <p className="mt-1 text-xs text-warmgrey">{customer.email}</p>
      </header>

      <CustomerDetail
        customer={customer}
        initialDocuments={documents}
        history={history}
        holdings={holdings}
      />
    </div>
  );
}

import Link from 'next/link';
import { getProducts } from '@/lib/queries/products';
import { ProductStatusBadge } from '@/components/shop/StatusBadge';
import { ShopDisabledBanner } from '@/components/admin/ShopDisabledBanner';
import { BUY_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-8">
      {!BUY_ENABLED && <ShopDisabledBanner />}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">Stock Control</span>
          <h1 className="font-display text-4xl text-white mt-2">Products</h1>
          <p className="mt-2 max-w-2xl text-sm text-warmgrey">
            Manage your collection - upload photos, set prices and toggle availability. Sold and reserved
            pieces automatically reflect on the public shop.
          </p>
        </div>
        <Link href="/admin/products/new" className="gc-btn-primary">
          Add Product
        </Link>
      </header>

      <div className="overflow-x-auto rounded-xl border border-gold-metallic/15">
        <table className="min-w-full divide-y divide-gold-metallic/10 text-sm">
          <thead className="bg-ink-900/80 text-left text-[11px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Metal · Carat</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Retail</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-ink-900/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="font-medium text-white hover:text-gold-bright">
                    {p.title}
                  </Link>
                  <div className="text-xs text-warmgrey">/{p.slug}</div>
                </td>
                <td className="px-4 py-3 text-warmgrey">{p.sku ?? '—'}</td>
                <td className="px-4 py-3 text-warmgrey">
                  {[p.metal_type, p.carat].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-4 py-3 text-white">{p.quantity}</td>
                <td className="px-4 py-3">
                  <ProductStatusBadge status={p.status} />
                </td>
                <td className="px-4 py-3 text-right text-gold-tint">
                  £{p.retail_price.toLocaleString('en-GB')}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="gc-btn-ghost">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

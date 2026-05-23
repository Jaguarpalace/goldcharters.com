import { getProductCategories } from '@/lib/queries/products';
import { ShopDisabledBanner } from '@/components/admin/ShopDisabledBanner';
import { BUY_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const categories = await getProductCategories();
  return (
    <div className="space-y-8">
      {!BUY_ENABLED && <ShopDisabledBanner />}
      <header className="flex items-end justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">Shop</span>
          <h1 className="font-display text-4xl text-white mt-2">Product Categories</h1>
        </div>
        <button type="button" className="gc-btn-primary">
          Add Category
        </button>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="gc-card flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-white">{c.name}</p>
              <p className="text-xs text-warmgrey">/{c.slug}</p>
            </div>
            <span className="gc-pill">{c.visible ? 'Visible' : 'Hidden'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

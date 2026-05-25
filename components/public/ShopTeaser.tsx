import Link from 'next/link';
import type { Product } from '@/types/database';
import type { HomepageSection } from '@/types/database';
import { ProductCard } from '@/components/shop/ProductCard';

export function ShopTeaser({
  section,
  products,
}: {
  section?: HomepageSection;
  products: Product[];
}) {
  return (
    <section className="relative border-t border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            {/* Eyebrow defers to the CMS subtitle so admins can override
                "Shop The Collection" without a code change. */}
            <span className="gc-eyebrow">{section?.subtitle || 'Shop The Collection'}</span>
            <h2 className="gc-heading mt-3">{section?.title ?? 'Shop Gold & Jewellery'}</h2>
            <p className="gc-subhead mt-4 max-w-xl">{section?.body}</p>
          </div>
          <Link href={section?.cta_href ?? '/shop'} className="gc-btn-secondary">
            {section?.cta_label ?? 'View Collection'}
          </Link>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

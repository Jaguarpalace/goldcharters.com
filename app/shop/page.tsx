import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getProductCategories, getProducts } from '@/lib/queries/products';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductFilters } from '@/components/shop/ProductFilters';
import { BUY_ENABLED } from '@/lib/features';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Shop · Gold & Jewellery Collection',
  description:
    'Browse our curated collection of jewellery and gold pieces available to buy online — with live stock, multiple photos and secure UK delivery.',
  // While the shop is hidden from navigation, search engines should not index
  // these routes either. Remove the robots block when re-enabling the shop.
  robots: BUY_ENABLED ? undefined : { index: false, follow: false },
};

type SearchParams = {
  category?: string;
  search?: string;
  sort?: string;
  in_stock?: string;
};

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  // Shop is currently disabled — bounce visitors home.
  if (!BUY_ENABLED) redirect('/');


  const [allProducts, categories] = await Promise.all([
    getProducts(),
    getProductCategories(),
  ]);

  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let products = [...allProducts];

  if (searchParams.category) {
    const catId = categoryBySlug.get(searchParams.category);
    if (catId) products = products.filter((p) => p.category_id === catId);
  }

  if (searchParams.search) {
    const q = searchParams.search.toLowerCase();
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.metal_type ?? '').toLowerCase().includes(q) ||
        (p.brand ?? '').toLowerCase().includes(q),
    );
  }

  if (searchParams.in_stock === '1') {
    products = products.filter((p) => p.status === 'active' && p.quantity > 0);
  }

  switch (searchParams.sort) {
    case 'price-asc':
      products.sort((a, b) => a.retail_price - b.retail_price);
      break;
    case 'price-desc':
      products.sort((a, b) => b.retail_price - a.retail_price);
      break;
    case 'featured':
      products.sort((a, b) => Number(b.featured) - Number(a.featured));
      break;
    default:
      products.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }

  return (
    <>
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-20 lg:py-24">
          <span className="gc-eyebrow">Shop The Collection</span>
          <h1 className="gc-heading-xl mt-5">Curated Gold & Jewellery</h1>
          <p className="gc-subhead mt-6 max-w-2xl">
            A small, considered selection of pieces from our private valuation house — diamonds, antique
            jewellery, gold bars, sovereigns and contemporary pieces. Live stock availability.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="gc-container">
          <Suspense
            fallback={<div className="gc-card p-6 text-sm text-warmgrey">Loading filters…</div>}
          >
            <ProductFilters categories={categories} total={products.length} />
          </Suspense>

          {products.length === 0 ? (
            <div className="gc-card mt-10 p-12 text-center text-warmgrey">
              <p>No pieces match your filters.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

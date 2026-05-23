import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getProductBySlug, getProducts } from '@/lib/queries/products';
import { formatGBP } from '@/lib/format';
import { BUY_ENABLED } from '@/lib/features';
import { ProductGallery } from '@/components/shop/ProductGallery';
import { AddToBasket } from '@/components/shop/AddToBasket';
import { ProductStatusBadge } from '@/components/shop/StatusBadge';
import { ProductCard } from '@/components/shop/ProductCard';

export const revalidate = 60;

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.seo_title ?? product.title,
    description: product.seo_description ?? product.description?.slice(0, 160) ?? undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  if (!BUY_ENABLED) redirect('/');
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = (await getProducts({ limit: 8 })).filter((p) => p.id !== product.id).slice(0, 4);

  const price = product.sale_price ?? product.retail_price;
  const onSale = product.sale_price != null && product.sale_price < product.retail_price;

  const detailRows: { label: string; value: string | null }[] = [
    { label: 'Metal', value: product.metal_type },
    { label: 'Carat', value: product.carat },
    { label: 'Weight', value: product.weight_grams ? `${product.weight_grams} g` : null },
    { label: 'Gemstones', value: product.gemstones },
    { label: 'Brand / House', value: product.brand },
    { label: 'Condition', value: product.condition },
    { label: 'Certificate', value: product.certificate_info },
    { label: 'Original box', value: product.box_included ? 'Included' : null },
    { label: 'SKU', value: product.sku },
  ];

  return (
    <>
      <section className="border-b border-gold-metallic/15 bg-ink-950">
        <div className="gc-container py-4 text-xs text-warmgrey">
          <Link href="/shop" className="hover:text-gold-tint">
            Shop
          </Link>
          <span className="mx-2 text-gold-metallic/50">/</span>
          <span className="text-white">{product.title}</span>
        </div>
      </section>

      <section className="py-12">
        <div className="gc-container grid gap-12 lg:grid-cols-[1.1fr,1fr]">
          <ProductGallery product={product} gallery={product.gallery} />

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ProductStatusBadge status={product.status} />
              {product.featured && (
                <span className="rounded-full bg-gold-gradient px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-ink-950">
                  Featured
                </span>
              )}
              {onSale && (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-amber-300">
                  Reduced
                </span>
              )}
            </div>
            <h1 className="gc-heading mt-4">{product.title}</h1>

            <div className="mt-5 flex items-baseline gap-4">
              <span className="font-display text-4xl text-gold-tint">{formatGBP(price)}</span>
              {onSale && (
                <span className="text-base text-warmgrey line-through">
                  {formatGBP(product.retail_price)}
                </span>
              )}
            </div>

            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-warmgrey">{product.description}</p>
            )}

            <div className="mt-8">
              <AddToBasket product={product} />
            </div>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {detailRows
                .filter((r) => r.value)
                .map((r) => (
                  <div key={r.label} className="border-b border-gold-metallic/10 py-2.5">
                    <dt className="text-[10px] uppercase tracking-luxe text-gold-tint">{r.label}</dt>
                    <dd className="mt-1 text-white">{r.value}</dd>
                  </div>
                ))}
            </dl>

            <div className="mt-10 gc-card p-5 text-xs text-warmgrey">
              <p>
                <span className="font-semibold text-gold-tint">Secure UK delivery.</span> All pieces are
                dispatched fully insured via tracked, signed-for courier. Complimentary on orders over £500.
              </p>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-gold-metallic/15 py-16">
          <div className="gc-container">
            <h2 className="gc-heading">You may also like</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

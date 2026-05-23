import Link from 'next/link';
import type { Product } from '@/types/database';
import { formatGBP, isPurchasable } from '@/lib/format';
import { ProductImage } from './ProductImage';
import { ProductStatusBadge } from './StatusBadge';

export function ProductCard({ product }: { product: Product }) {
  const purchasable = isPurchasable(product);

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group block overflow-hidden rounded-2xl border border-gold-metallic/15 bg-ink-900/60 transition-transform duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <ProductImage product={product} className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex gap-2">
          <ProductStatusBadge status={product.status} />
          {product.featured && (
            <span className="rounded-full bg-gold-gradient px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-ink-950">
              Featured
            </span>
          )}
        </div>
      </div>
      <div className="border-t border-gold-metallic/15 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="line-clamp-2 font-display text-lg text-white">{product.title}</h3>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-warmgrey">
            {[product.metal_type, product.carat].filter(Boolean).join(' · ')}
          </p>
          <p className="font-display text-xl text-gold-tint">{formatGBP(product.retail_price)}</p>
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint group-hover:text-gold-bright">
          {purchasable ? 'View & Add to Basket' : 'View Details'}
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

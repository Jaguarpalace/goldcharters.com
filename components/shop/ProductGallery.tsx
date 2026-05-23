'use client';

import { useState } from 'react';
import type { Product } from '@/types/database';
import { ProductImage } from './ProductImage';

export function ProductGallery({
  product,
  gallery,
}: {
  product: Product;
  gallery: { id: string; image_url: string; alt_text: string | null }[];
}) {
  // The first slot is always the product's main image (or its placeholder).
  const slots: { id: string; image_url: string | null; alt_text: string | null }[] = [
    { id: 'main', image_url: product.main_image_url, alt_text: product.title },
    ...gallery,
  ];

  const [activeIdx, setActiveIdx] = useState(0);
  const active = slots[activeIdx] ?? slots[0];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-3xl border border-gold-metallic/20 bg-ink-900/60">
        <ProductImage
          product={product}
          imageUrl={active?.image_url ?? undefined}
          className="h-full w-full object-cover"
        />
      </div>

      {slots.length > 1 && (
        <ul className="mt-4 grid grid-cols-5 gap-2">
          {slots.map((slot, i) => (
            <li key={slot.id}>
              <button
                type="button"
                onClick={() => setActiveIdx(i)}
                aria-label={`View image ${i + 1}`}
                className={
                  'block aspect-square w-full overflow-hidden rounded-lg border transition ' +
                  (activeIdx === i
                    ? 'border-gold-metallic shadow-[0_0_18px_rgba(212,175,55,0.35)]'
                    : 'border-gold-metallic/15 hover:border-gold-metallic/40')
                }
              >
                <ProductImage
                  product={product}
                  imageUrl={slot.image_url ?? undefined}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

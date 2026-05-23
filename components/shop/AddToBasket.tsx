'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/types/database';
import { isPurchasable } from '@/lib/format';
import { useCart } from '@/lib/cart/cartStore';

export function AddToBasket({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [feedback, setFeedback] = useState<string | null>(null);

  const purchasable = isPurchasable(product);

  if (!purchasable) {
    const label =
      product.status === 'sold'
        ? 'This piece has been sold'
        : product.status === 'reserved'
          ? 'Currently reserved'
          : product.status === 'out_of_stock'
            ? 'Out of stock'
            : 'Currently unavailable';
    return (
      <button type="button" disabled className="gc-btn-secondary w-full opacity-60">
        {label}
      </button>
    );
  }

  const handleAdd = () => {
    add({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.main_image_url,
      unitPrice: product.sale_price ?? product.retail_price,
      maxQuantity: product.quantity,
      sku: product.sku,
    });
    setFeedback('Added to basket');
    setTimeout(() => setFeedback(null), 2200);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button type="button" onClick={handleAdd} className="gc-btn-primary flex-1">
          Add to Basket
        </button>
        <button
          type="button"
          onClick={() => {
            handleAdd();
            router.push('/basket');
          }}
          className="gc-btn-secondary flex-1"
        >
          Buy Now
        </button>
      </div>
      {feedback && <p className="text-xs text-gold-tint">{feedback}</p>}
    </div>
  );
}

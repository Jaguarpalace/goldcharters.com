'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/cartStore';

export function BasketIndicator() {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const count = hydrated ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  return (
    <Link
      href="/basket"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-metallic/30 text-gold-metallic hover:border-gold-bright hover:text-gold-bright"
      aria-label={`Basket · ${count} items`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M5 7h14l-1.5 11a2 2 0 01-2 1.8h-7a2 2 0 01-2-1.8L5 7z" />
        <path d="M9 7V5a3 3 0 016 0v2" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-ink-950"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #B8860B)',
            boxShadow: '0 0 10px rgba(212,175,55,0.55)',
          }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

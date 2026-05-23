// Pure utility functions — safe to import from both server and client components.
// IMPORTANT: do NOT import anything from `lib/supabase/server` here, or this file
// stops being client-safe.

import type { Faq, FaqCategory, Product } from '@/types/database';

export function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function isPurchasable(product: Product) {
  return product.status === 'active' && product.quantity > 0 && product.visible;
}

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  selling_gold: 'Selling Gold',
  selling_jewellery: 'Selling Jewellery',
  calculator: 'Gold Calculator',
  buying_jewellery: 'Buying Jewellery',
  delivery: 'Delivery',
  stock_orders: 'Stock & Orders',
};

export function groupFaqsByCategory(faqs: Faq[]): Record<FaqCategory, Faq[]> {
  const groups: Record<FaqCategory, Faq[]> = {
    selling_gold: [],
    selling_jewellery: [],
    calculator: [],
    buying_jewellery: [],
    delivery: [],
    stock_orders: [],
  };
  for (const faq of faqs) groups[faq.category].push(faq);
  return groups;
}

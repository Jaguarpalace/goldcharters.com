// Pure utility functions — safe to import from both server and client components.
// IMPORTANT: do NOT import anything from `lib/supabase/server` here, or this file
// stops being client-safe.

import type { Buyer, Faq, FaqCategory, Product } from '@/types/database';

/** One-line postal address for invoices and buyer cards. */
export function formatBuyerAddress(b: Partial<Buyer> | null | undefined): string {
  if (!b) return '';
  return [b.address_line1, b.address_line2, b.city, b.postcode, b.country]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join(', ');
}

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

/**
 * UK phone number for display: an 11-digit number becomes "07951 999 999".
 * Anything else (international, short codes, already spaced) is returned as
 * typed. Use the raw digits, not this, in tel: links.
 */
export function formatUkPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D+/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone.trim();
}

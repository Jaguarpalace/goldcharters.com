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

/* ---------------------------------------------------------------- Dates */

/**
 * Dates on printed documents and in emails are rendered on the server,
 * where Node runs in UTC even on the London Vercel region. Without an
 * explicit zone a 14:57 BST payment prints as 13:57. Always format through
 * these for anything the customer or an auditor will read.
 */
const LONDON = 'Europe/London';

export function formatDateGB(
  iso: string | Date,
  style: 'numeric' | 'long' = 'numeric',
): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', {
    timeZone: LONDON,
    day: '2-digit',
    month: style === 'long' ? 'long' : '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeGB(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString('en-GB', {
    timeZone: LONDON,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * A timestamp that was captured from a date-only picker lands at exactly
 * midnight UTC. Printing "00:00" (or "01:00" in summer) for it is noise, so
 * such values render as a date alone; real timestamps keep their time.
 */
export function formatPaidAtGB(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const midnightUtc =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  return midnightUtc ? formatDateGB(d) : formatDateTimeGB(d);
}

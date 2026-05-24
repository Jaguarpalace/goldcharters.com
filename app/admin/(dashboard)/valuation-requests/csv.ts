import type {
  PaymentMethod,
  ValuationRequest,
  ValuationRequestStatus,
} from '@/types/database';
import {
  PAYMENT_METHOD_LABELS,
  VALUATION_STATUS_LABELS,
} from '@/types/database';

/**
 * Column definition for the CSV export. Order matters — it dictates the
 * column order in the downloaded file.
 */
const COLUMNS: Array<{
  header: string;
  value: (r: ValuationRequest) => string;
}> = [
  { header: 'Submitted', value: (r) => new Date(r.created_at).toISOString() },
  { header: 'First name', value: (r) => r.first_name },
  { header: 'Last name', value: (r) => r.last_name },
  { header: 'Email', value: (r) => r.email },
  { header: 'Phone', value: (r) => r.phone },
  { header: 'Status', value: (r) => VALUATION_STATUS_LABELS[r.status as ValuationRequestStatus] ?? r.status },
  { header: 'Branch', value: (r) => r.form_variant ?? '' },
  { header: 'Item type', value: (r) => r.item_type ?? '' },
  { header: 'Metal', value: (r) => r.metal_type ?? '' },
  { header: 'Category', value: (r) => r.item_category ?? '' },
  { header: 'Jewellery type', value: (r) => r.jewellery_type ?? '' },
  { header: 'Gemstone', value: (r) => r.gemstone ?? '' },
  { header: 'Brand', value: (r) => r.brand ?? '' },
  { header: 'Model', value: (r) => r.model ?? '' },
  { header: 'Condition', value: (r) => r.condition ?? '' },
  { header: 'Box/papers', value: (r) => r.box_papers ?? '' },
  { header: 'Carat', value: (r) => r.carat ?? '' },
  { header: 'Weight (g)', value: (r) => (r.weight_grams !== null ? String(r.weight_grams) : '') },
  { header: 'Customer estimate (£)', value: (r) => (r.estimated_value !== null ? String(r.estimated_value) : '') },
  { header: 'Preferred contact', value: (r) => r.preferred_contact_method },
  { header: 'Description', value: (r) => r.description ?? '' },
  { header: 'Internal notes', value: (r) => r.notes ?? '' },
  { header: 'Payment amount (£)', value: (r) => (r.payment_amount !== null ? String(r.payment_amount) : '') },
  { header: 'Payment method', value: (r) => (r.payment_method ? PAYMENT_METHOD_LABELS[r.payment_method as PaymentMethod] : '') },
  { header: 'Payment reference', value: (r) => r.payment_reference ?? '' },
  { header: 'Paid at', value: (r) => (r.paid_at ? new Date(r.paid_at).toISOString() : '') },
];

/** Escape a single CSV cell per RFC 4180 — wrap in quotes if it contains a delimiter. */
function escapeCell(raw: string): string {
  if (raw === '') return '';
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Build a CSV string with a BOM so Excel opens UTF-8 correctly. */
export function buildValuationsCsv(rows: ValuationRequest[]): string {
  const lines: string[] = [];
  lines.push(COLUMNS.map((c) => escapeCell(c.header)).join(','));
  for (const r of rows) {
    lines.push(COLUMNS.map((c) => escapeCell(c.value(r))).join(','));
  }
  return '﻿' + lines.join('\r\n');
}

/** Trigger a browser download of `content` as `filename`. Client-only. */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Give the browser a tick before revoking — Safari needs it.
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

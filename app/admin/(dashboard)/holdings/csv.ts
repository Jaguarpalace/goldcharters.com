import type { StockItem } from '@/types/database';

/**
 * Columns for the holdings ledger CSV export.
 *
 * Order matters — same order in every variant (held / acquisitions / sales)
 * so a reconciliation team can drop them into the same spreadsheet template.
 *
 * Each value() returns a plain string; numeric values are kept unformatted
 * (no £ sign, no thousands separators) so Excel imports them as numbers.
 */
type Col = { header: string; value: (r: StockItem) => string };

const COMMON_COLUMNS: Col[] = [
  { header: 'Stock #', value: (r) => r.stock_number },
  { header: 'Status', value: (r) => r.status },
  { header: 'Acquired at', value: (r) => new Date(r.acquired_at).toISOString() },
  { header: 'Item type', value: (r) => r.item_type ?? '' },
  { header: 'Metal', value: (r) => r.metal_type ?? '' },
  { header: 'Carat', value: (r) => r.carat ?? '' },
  { header: 'Purity %', value: (r) => (r.purity_percentage != null ? String(r.purity_percentage) : '') },
  { header: 'Weight (g)', value: (r) => (r.weight_grams != null ? String(r.weight_grams) : '') },
  { header: 'Description', value: (r) => r.description ?? '' },
  { header: 'Paid (£)', value: (r) => String(r.acquired_paid_gbp) },
  {
    header: 'Spot at purchase (£/g)',
    value: (r) => (r.acquired_spot_gbp_per_g != null ? String(r.acquired_spot_gbp_per_g) : ''),
  },
  { header: 'Notes', value: (r) => r.notes ?? '' },
];

const SALE_COLUMNS: Col[] = [
  { header: 'Sold at', value: (r) => (r.sold_at ? new Date(r.sold_at).toISOString() : '') },
  { header: 'Buyer', value: (r) => r.sold_to_name ?? '' },
  { header: 'Buyer email', value: (r) => r.sold_to_email ?? '' },
  { header: 'Sale amount (£)', value: (r) => (r.sold_amount_gbp != null ? String(r.sold_amount_gbp) : '') },
  {
    header: 'Spot at sale (£/g)',
    value: (r) => (r.sold_spot_gbp_per_g != null ? String(r.sold_spot_gbp_per_g) : ''),
  },
  {
    header: 'Realised P&L (£)',
    value: (r) => {
      if (r.sold_amount_gbp == null) return '';
      const paid = Number(r.acquired_paid_gbp) || 0;
      const sold = Number(r.sold_amount_gbp) || 0;
      return (sold - paid).toFixed(2);
    },
  },
];

function escapeCell(raw: string): string {
  if (raw === '') return '';
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function buildCsv(rows: StockItem[], columns: Col[]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => escapeCell(c.header)).join(','));
  for (const r of rows) {
    lines.push(columns.map((c) => escapeCell(c.value(r))).join(','));
  }
  // BOM so Excel opens UTF-8 correctly.
  return '﻿' + lines.join('\r\n');
}

/** Held snapshot — common columns only, no sale fields. */
export function buildHoldingsHeldCsv(rows: StockItem[]): string {
  return buildCsv(rows, COMMON_COLUMNS);
}

/** Acquisitions in a date range — common columns. */
export function buildHoldingsAcquisitionsCsv(rows: StockItem[]): string {
  return buildCsv(rows, COMMON_COLUMNS);
}

/** Sales in a date range — common + sale columns. */
export function buildHoldingsSalesCsv(rows: StockItem[]): string {
  return buildCsv(rows, [...COMMON_COLUMNS, ...SALE_COLUMNS]);
}

/** Browser download helper — mirrors the valuation-requests pattern. */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

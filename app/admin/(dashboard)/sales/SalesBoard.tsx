'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SaleRow } from '@/lib/queries/sales';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SalesBoard({ initialSales }: { initialSales: SaleRow[] }) {
  const [search, setSearch] = useState('');
  const [showVoided, setShowVoided] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialSales.filter((s) => {
      if (!showVoided && s.voided_at) return false;
      if (!q) return true;
      return [s.invoice_number, s.buyer?.name, s.buyer?.email, s.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [initialSales, search, showVoided]);

  const total = filtered.filter((s) => !s.voided_at).reduce((sum, s) => sum + (Number(s.total_gbp) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice number or buyer…"
          className="min-w-[220px] flex-1 rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
        <label className="flex items-center gap-2 text-[11px] text-warmgrey">
          <input
            type="checkbox"
            checked={showVoided}
            onChange={(e) => setShowVoided(e.target.checked)}
            className="h-3.5 w-3.5 accent-gold-metallic"
          />
          Show voided
        </label>
        <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
          {filtered.length} invoice{filtered.length === 1 ? '' : 's'} · {gbp(total)}
        </span>
        <Link
          href="/admin/holdings"
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright"
        >
          New sale from holdings
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-3 py-2 text-left">Invoice</th>
              <th className="px-2 py-2 text-left">Date</th>
              <th className="px-2 py-2 text-left">Buyer</th>
              <th className="px-2 py-2 text-right">Items</th>
              <th className="px-2 py-2 text-right">Total</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-warmgrey">
                  {initialSales.length === 0
                    ? 'No sales recorded yet. Select items on the Holdings page and mark them sold.'
                    : 'No invoices match.'}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className={'align-top hover:bg-ink-900/40 ' + (s.voided_at ? 'opacity-60' : '')}>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link
                      href={`/admin/sales/${s.id}`}
                      className="font-mono text-[12px] font-medium text-white hover:text-gold-bright"
                    >
                      {s.invoice_number}
                    </Link>
                    {s.voided_at && (
                      <div className="text-[9px] uppercase tracking-luxe text-red-300">Voided</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[12px] text-warmgrey">
                    {new Date(s.sold_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-2 py-2.5 text-[12px]">
                    {s.buyer ? (
                      <Link href={`/admin/buyers/${s.buyer.id}`} className="text-white hover:text-gold-bright">
                        {s.buyer.name}
                      </Link>
                    ) : (
                      <span className="text-warmgrey">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right text-[12px] text-white">{s.item_count}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
                    {gbp(Number(s.total_gbp) || 0)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-right">
                    <Link
                      href={`/admin/sales/${s.id}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-luxe text-gold-metallic/70 hover:text-gold-bright"
                    >
                      Invoice
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

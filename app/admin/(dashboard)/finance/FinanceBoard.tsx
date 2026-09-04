'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { StockItem } from '@/types/database';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/database';
import type { FinanceData, FinancePurchase } from '@/lib/queries/finance';

/* ------------------------------------------------------------- helpers -- */

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const gbp0 = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

type PeriodKey = 'this_month' | 'last_month' | 'last_3' | 'this_year' | 'all';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_3', label: 'Last 3 months' },
  { key: 'this_year', label: 'This year' },
  { key: 'all', label: 'All time' },
];

function periodRange(key: PeriodKey): { from: Date | null; to: Date | null } {
  const now = new Date();
  const som = (y: number, m: number) => new Date(y, m, 1);
  switch (key) {
    case 'this_month':
      return { from: som(now.getFullYear(), now.getMonth()), to: null };
    case 'last_month':
      return {
        from: som(now.getFullYear(), now.getMonth() - 1),
        to: som(now.getFullYear(), now.getMonth()),
      };
    case 'last_3':
      return { from: som(now.getFullYear(), now.getMonth() - 2), to: null };
    case 'this_year':
      return { from: som(now.getFullYear(), 0), to: null };
    case 'all':
      return { from: null, to: null };
  }
}

function inRange(iso: string | null, from: Date | null, to: Date | null): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (from && t < from.getTime()) return false;
  if (to && t >= to.getTime()) return false;
  return true;
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const soldMargin = (s: StockItem) =>
  (Number(s.sold_amount_gbp) || 0) - (Number(s.acquired_paid_gbp) || 0);

/* ---------------------------------------------------------------- board -- */

export function FinanceBoard({ data }: { data: FinanceData }) {
  const [period, setPeriod] = useState<PeriodKey>('this_month');
  const { from, to } = periodRange(period);
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? '';

  const purchases = useMemo(
    () => data.purchases.filter((p) => inRange(p.paid_at, from, to)),
    [data.purchases, from, to],
  );
  const sold = useMemo(
    () => data.soldItems.filter((s) => inRange(s.sold_at, from, to)),
    [data.soldItems, from, to],
  );

  const bought = purchases.reduce((s, p) => s + p.amount_gbp, 0);
  const soldTotal = sold.reduce((s, i) => s + (Number(i.sold_amount_gbp) || 0), 0);
  const soldCost = sold.reduce((s, i) => s + (Number(i.acquired_paid_gbp) || 0), 0);
  const profit = soldTotal - soldCost;
  const profitPct = soldCost > 0 ? (profit / soldCost) * 100 : 0;
  const avgMargin = sold.length > 0 ? profit / sold.length : 0;

  /* ---- 12-month trend (independent of the period picker) ---- */
  const trend = useMemo(() => {
    const now = new Date();
    const months: Array<{ key: string; label: string; out: number; in: number; profit: number }> =
      [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-GB', { month: 'short' }),
        out: 0,
        in: 0,
        profit: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    const keyOf = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    for (const p of data.purchases) {
      const m = byKey.get(keyOf(p.paid_at));
      if (m) m.out += p.amount_gbp;
    }
    for (const s of data.soldItems) {
      if (!s.sold_at) continue;
      const m = byKey.get(keyOf(s.sold_at));
      if (m) {
        m.in += Number(s.sold_amount_gbp) || 0;
        m.profit += soldMargin(s);
      }
    }
    return months;
  }, [data.purchases, data.soldItems]);

  /* ---- profit by metal (period) ---- */
  const byMetal = useMemo(() => {
    const groups = new Map<string, { profit: number; count: number }>();
    for (const s of sold) {
      const key = s.metal_type ?? 'Watches & other';
      const g = groups.get(key) ?? { profit: 0, count: 0 };
      g.profit += soldMargin(s);
      g.count += 1;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].profit - a[1].profit);
  }, [sold]);

  /* ---- payment method split (period) ---- */
  const byMethod = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();
    for (const p of purchases) {
      const key = p.method ? PAYMENT_METHOD_LABELS[p.method as PaymentMethod] : 'Not recorded';
      const g = groups.get(key) ?? { total: 0, count: 0 };
      g.total += p.amount_gbp;
      g.count += 1;
      groups.set(key, g);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [purchases]);

  /* ---- ageing + repeat sellers (always all-time) ---- */
  const ageing = useMemo(
    () =>
      data.heldItems
        .map((s) => ({ item: s, days: daysBetween(s.acquired_at, new Date().toISOString()) ?? 0 }))
        .filter((x) => x.days >= 60)
        .sort((a, b) => b.days - a.days),
    [data.heldItems],
  );
  const repeatSellers = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; count: number }>();
    for (const p of data.purchases) {
      const key = p.seller_email.trim().toLowerCase();
      const g = groups.get(key) ?? { name: p.seller_name, total: 0, count: 0 };
      g.total += p.amount_gbp;
      g.count += 1;
      groups.set(key, g);
    }
    return Array.from(groups.values())
      .filter((g) => g.count > 1)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [data.purchases]);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  /* ---- CSV exports ---- */
  const exportPurchases = () =>
    downloadCsv(
      `purchases_${period}.csv`,
      ['Date', 'Reference', 'Seller', 'Email', 'Items', 'Summary', 'Method', 'Amount GBP'],
      purchases.map((p) => [
        fmtDate(p.paid_at),
        p.reference,
        p.seller_name,
        p.seller_email,
        p.item_count,
        p.summary,
        p.method ? PAYMENT_METHOD_LABELS[p.method as PaymentMethod] : '',
        p.amount_gbp.toFixed(2),
      ]),
    );
  const exportSold = () =>
    downloadCsv(
      `sold_items_${period}.csv`,
      ['Sold date', 'Stock no', 'Description', 'Metal', 'Bought GBP', 'Sold GBP', 'Margin GBP', 'Margin %', 'Days held'],
      sold.map((s) => {
        const paid = Number(s.acquired_paid_gbp) || 0;
        const m = soldMargin(s);
        return [
          fmtDate(s.sold_at),
          s.stock_number,
          s.description ?? '',
          s.metal_type ?? '',
          paid.toFixed(2),
          (Number(s.sold_amount_gbp) || 0).toFixed(2),
          m.toFixed(2),
          paid > 0 ? ((m / paid) * 100).toFixed(1) : '',
          daysBetween(s.acquired_at, s.sold_at) ?? '',
        ];
      }),
    );
  const exportMonthly = () =>
    downloadCsv(
      'monthly_summary_12m.csv',
      ['Month', 'Purchases GBP', 'Sales GBP', 'Realised profit GBP'],
      trend.map((m) => [m.key, m.out.toFixed(2), m.in.toFixed(2), m.profit.toFixed(2)]),
    );

  return (
    <div className="space-y-6">
      {/* Period picker */}
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={
              'rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe transition ' +
              (period === p.key
                ? 'border-gold-metallic bg-gold-metallic/15 text-gold-bright'
                : 'border-gold-metallic/20 text-warmgrey hover:border-gold-metallic/50 hover:text-gold-tint')
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary: compact 2x2 KPI grid on the left, trend chart on the
          right, one section at matched height so everything below sits
          higher up the page. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-[1fr,1.35fr]">
        <div className="grid grid-cols-2 grid-rows-2 gap-3">
          <Kpi label="Bought" value={gbp0(bought)} sub={`${purchases.length} purchase${purchases.length === 1 ? '' : 's'}`} />
          <Kpi label="Sold" value={gbp0(soldTotal)} sub={`${sold.length} item${sold.length === 1 ? '' : 's'}`} />
          <Kpi
            label="Realised profit"
            value={sold.length > 0 ? `${gbp0(profit)}` : '—'}
            sub={sold.length > 0 ? pct(profitPct) : 'No sales in period'}
            tone={sold.length === 0 ? undefined : profit >= 0 ? 'positive' : 'negative'}
          />
          <Kpi
            label="Avg margin / item"
            value={sold.length > 0 ? gbp0(avgMargin) : '—'}
            sub={sold.length > 0 ? 'across sold items' : undefined}
          />
        </div>

        <section className="flex flex-col rounded-xl border border-gold-metallic/20 bg-ink-950 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
              12-month trend
            </h2>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-3 text-[9px] uppercase tracking-luxe text-warmgrey sm:flex">
                <LegendSwatch className="bg-blue-400/70" label="Out" />
                <LegendSwatch className="bg-gold-metallic" label="In" />
                <LegendSwatch className="bg-emerald-400" label="Profit" />
              </span>
              <button type="button" onClick={exportMonthly} className="text-[10px] uppercase tracking-luxe text-gold-tint hover:text-gold-bright">
                ↓ CSV
              </button>
            </div>
          </div>
          <div className="mt-2 flex-1">
            <TrendChart months={trend} />
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profit by metal */}
        <Panel title={`Realised profit by metal · ${periodLabel}`}>
          {byMetal.length === 0 ? (
            <Empty text="No sales in this period." />
          ) : (
            <ul className="space-y-2.5">
              {byMetal.map(([metal, g]) => {
                const max = Math.max(...byMetal.map(([, x]) => Math.abs(x.profit)), 1);
                return (
                  <li key={metal}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-white">{metal}</span>
                      <span className={g.profit >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                        {gbp0(g.profit)} <span className="text-warmgrey">· {g.count}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-900">
                      <div
                        className={g.profit >= 0 ? 'h-full bg-gold-metallic' : 'h-full bg-red-400'}
                        style={{ width: `${(Math.abs(g.profit) / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Payment split */}
        <Panel title={`Payments out, by method · ${periodLabel}`}>
          {byMethod.length === 0 ? (
            <Empty text="No purchases in this period." />
          ) : (
            <ul className="divide-y divide-gold-metallic/10 text-sm">
              {byMethod.map(([label, g]) => (
                <li key={label} className="flex items-baseline justify-between py-2">
                  <span className="text-white">{label}</span>
                  <span className="text-warmgrey">
                    {g.count} · <span className="font-semibold text-gold-bright">{gbp0(g.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Sold items margins */}
      <Panel
        title={`Sold items - margins · ${periodLabel}`}
        action={
          sold.length > 0 ? (
            <button type="button" onClick={exportSold} className="text-[10px] uppercase tracking-luxe text-gold-tint hover:text-gold-bright">
              ↓ CSV
            </button>
          ) : undefined
        }
      >
        {sold.length === 0 ? (
          <Empty text="No sales in this period. Record sales from Holdings → item → Record sale." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-metallic/20 text-left text-[10px] uppercase tracking-luxe text-gold-tint">
                  <th className="py-2 pr-3 font-semibold">Sold</th>
                  <th className="py-2 pr-3 font-semibold">Stock no</th>
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 text-right font-semibold">Bought</th>
                  <th className="py-2 pr-3 text-right font-semibold">Sold for</th>
                  <th className="py-2 pr-3 text-right font-semibold">Margin</th>
                  <th className="py-2 text-right font-semibold">Days held</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-metallic/10">
                {sold.map((s) => {
                  const paid = Number(s.acquired_paid_gbp) || 0;
                  const m = soldMargin(s);
                  return (
                    <tr key={s.id} className="text-warmgrey">
                      <td className="whitespace-nowrap py-2 pr-3">{fmtDate(s.sold_at)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 font-mono text-[12px] text-gold-tint">
                        {s.stock_number}
                      </td>
                      <td className="max-w-[260px] truncate py-2 pr-3 text-white">{s.description ?? '—'}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{gbp(paid)}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">{gbp(Number(s.sold_amount_gbp) || 0)}</td>
                      <td className={'whitespace-nowrap py-2 pr-3 text-right font-semibold ' + (m >= 0 ? 'text-emerald-300' : 'text-red-300')}>
                        {gbp(m)}{paid > 0 ? ` · ${pct((m / paid) * 100)}` : ''}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">{daysBetween(s.acquired_at, s.sold_at) ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stock ageing */}
        <Panel title="Stock ageing - held 60+ days">
          {ageing.length === 0 ? (
            <Empty text="Nothing has been sitting for 60 days or more. Healthy turnover." />
          ) : (
            <ul className="divide-y divide-gold-metallic/10 text-sm">
              {ageing.map(({ item, days }) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="font-mono text-[12px] text-gold-tint">{item.stock_number}</span>{' '}
                    <span className="truncate text-white">{item.description ?? '—'}</span>
                  </span>
                  <span className="whitespace-nowrap text-warmgrey">
                    {gbp0(Number(item.acquired_paid_gbp) || 0)} ·{' '}
                    <span className={days >= 90 ? 'font-semibold text-red-300' : 'font-semibold text-amber-300'}>
                      {days}d
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Repeat sellers */}
        <Panel title="Repeat sellers">
          {repeatSellers.length === 0 ? (
            <Empty text="No repeat sellers yet - they will appear after a second purchase from the same customer." />
          ) : (
            <ul className="divide-y divide-gold-metallic/10 text-sm">
              {repeatSellers.map((g) => (
                <li key={g.name + g.total} className="flex items-baseline justify-between py-2">
                  <span className="text-white">{g.name}</span>
                  <span className="text-warmgrey">
                    {g.count} purchases · <span className="font-semibold text-gold-bright">{gbp0(g.total)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Documents register */}
      <Panel
        title={`Purchase documents · ${periodLabel}`}
        action={
          purchases.length > 0 ? (
            <button type="button" onClick={exportPurchases} className="text-[10px] uppercase tracking-luxe text-gold-tint hover:text-gold-bright">
              ↓ CSV
            </button>
          ) : undefined
        }
      >
        {purchases.length === 0 ? (
          <Empty text="No paid purchases in this period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-metallic/20 text-left text-[10px] uppercase tracking-luxe text-gold-tint">
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Reference</th>
                  <th className="py-2 pr-3 font-semibold">Seller</th>
                  <th className="py-2 pr-3 text-right font-semibold">Items</th>
                  <th className="py-2 pr-3 font-semibold">Method</th>
                  <th className="py-2 pr-3 text-right font-semibold">Amount</th>
                  <th className="py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-metallic/10">
                {purchases.map((p) => (
                  <tr key={p.id} className="text-warmgrey">
                    <td className="whitespace-nowrap py-2 pr-3">{fmtDate(p.paid_at)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-[12px] font-semibold tracking-widest text-gold-bright">
                      {p.reference}
                    </td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-white">{p.seller_name}</td>
                    <td className="py-2 pr-3 text-right">{p.item_count}</td>
                    <td className="whitespace-nowrap py-2 pr-3">
                      {p.method ? PAYMENT_METHOD_LABELS[p.method as PaymentMethod] : '—'}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold text-gold-bright">
                      {gbp(p.amount_gbp)}
                    </td>
                    <td className="whitespace-nowrap py-2 text-right">
                      <Link
                        href={`/admin/valuation-requests/${p.id}/print`}
                        className="text-[11px] uppercase tracking-luxe text-gold-tint hover:text-gold-bright"
                      >
                        Document →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ chart ----- */

function TrendChart({
  months,
}: {
  months: Array<{ label: string; out: number; in: number; profit: number }>;
}) {
  const W = 560;
  const H = 150;
  const PAD = { top: 10, bottom: 22, left: 6, right: 6 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(...months.map((m) => Math.max(m.out, m.in, m.profit)), 1);
  const slot = innerW / months.length;
  const barW = Math.min(14, slot / 3);
  const y = (v: number) => PAD.top + innerH - (Math.max(v, 0) / max) * innerH;

  const profitPoints = months
    .map((m, i) => `${PAD.left + slot * i + slot / 2},${y(m.profit)}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full min-w-[420px] w-full" role="img" aria-label="12-month purchases, sales and profit trend">
        {/* baseline */}
        <line x1={PAD.left} y1={PAD.top + innerH} x2={W - PAD.right} y2={PAD.top + innerH} stroke="rgba(212,175,55,0.25)" strokeWidth="1" />
        {months.map((m, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          return (
            <g key={m.label + i}>
              <rect x={cx - barW - 1.5} y={y(m.out)} width={barW} height={PAD.top + innerH - y(m.out)} rx="1.5" fill="rgba(96,165,250,0.65)" />
              <rect x={cx + 1.5} y={y(m.in)} width={barW} height={PAD.top + innerH - y(m.in)} rx="1.5" fill="#d4af37" />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" fill="rgba(200,195,180,0.7)">
                {m.label}
              </text>
            </g>
          );
        })}
        <polyline points={profitPoints} fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {months.map((m, i) => (
          <circle key={i} cx={PAD.left + slot * i + slot / 2} cy={y(m.profit)} r="2.5" fill="#34d399" />
        ))}
      </svg>
    </div>
  );
}

/* --------------------------------------------------------- primitives --- */

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-gold-metallic/20 bg-ink-950 px-3.5 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-luxe text-gold-tint">{label}</p>
      <p className={'mt-1 font-display text-lg font-semibold leading-tight ' + (tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-red-300' : 'text-white')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-warmgrey">{sub}</p>}
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gold-metallic/20 bg-ink-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-warmgrey">{text}</p>;
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={'inline-block h-2 w-3 rounded-sm ' + className} />
      {label}
    </span>
  );
}

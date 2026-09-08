'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { StockItem } from '@/types/database';
import {
  createStockItem,
  fetchAcquisitionsInRange,
  fetchSalesInRange,
} from '@/lib/actions/stockItems';
import type { MetalKey, PortfolioSlice, PortfolioSnapshot } from '@/lib/queries/stockItems';
import { allocatedWeight, remainingWeight } from '@/lib/holdings/split';
import {
  buildHoldingsAcquisitionsCsv,
  buildHoldingsHeldCsv,
  buildHoldingsSalesCsv,
  downloadCsv,
} from './csv';
import { HOLDINGS_CARAT_OPTIONS, purityToPercent } from '@/lib/schemas/valuationFormOptions';
import { SaleModal } from '../_components/SaleModal';

const METAL_ORDER: MetalKey[] = ['gold', 'silver', 'platinum', 'palladium'];
const METAL_LABELS: Record<MetalKey, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
};
const METAL_OPTIONS = ['Gold', 'Silver', 'Platinum', 'Palladium'] as const;

/** Can this row be broken into pieces? Bulk rows only, with a weight, not already a piece. */
export function canSplit(item: StockItem): boolean {
  return (
    !item.parent_stock_item_id &&
    (item.status === 'held' || item.status === 'split') &&
    (Number(item.weight_grams) || 0) > 0
  );
}

export function HoldingsBoard({
  initialItems,
  childrenByParent,
  snapshot,
  spotMap,
}: {
  /** Held rows plus split parents (their pieces come via childrenByParent). */
  initialItems: StockItem[];
  childrenByParent: Record<string, StockItem[]>;
  snapshot: PortfolioSnapshot;
  spotMap: Record<MetalKey, number | null>;
}) {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selling, setSelling] = useState(false);
  const [openParents, setOpenParents] = useState<Set<string>>(
    () => new Set(Object.keys(childrenByParent)),
  );

  const haystack = (i: StockItem) =>
    [i.stock_number, i.item_type, i.metal_type, i.carat, i.description, i.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    // A parent stays visible when any of its pieces match, so the code you
    // searched for is never hidden inside a collapsed group.
    return items.filter(
      (i) =>
        haystack(i).includes(q) ||
        (childrenByParent[i.id] ?? []).some((c) => haystack(c).includes(q)),
    );
  }, [items, search, childrenByParent]);

  // Everything sellable, flattened: held rows and held pieces of split rows.
  const sellable = useMemo(() => {
    const map = new Map<string, StockItem>();
    for (const i of items) {
      if (i.status === 'held') map.set(i.id, i);
      for (const c of childrenByParent[i.id] ?? []) if (c.status === 'held') map.set(c.id, c);
    }
    return map;
  }, [items, childrenByParent]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedItems = [...selected].map((id) => sellable.get(id)).filter((i): i is StockItem => !!i);

  return (
    <div className="space-y-6">
      {/* ----------------------------- Combined totals ----------------------- */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Portfolio
        </h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Items held" value={snapshot.combined.count.toString()} />
          <StatCard label="Cost basis" value={formatGBP(snapshot.combined.total_cost_gbp)} />
          <StatCard
            label="Current value"
            value={formatGBP(snapshot.combined.total_current_value_gbp)}
            sub={
              snapshot.spot_fetched_at
                ? `Spot fetched ${formatTimeAgo(snapshot.spot_fetched_at)}`
                : 'Live spot unavailable'
            }
          />
          <StatCard
            label="Variance to spot"
            value={`${formatGBP(snapshot.combined.pl_gbp, true)} · ${formatPct(snapshot.combined.pl_pct)}`}
            sub="current spot value vs what we paid"
            tone={snapshot.combined.pl_gbp >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </section>

      {/* ----------------------------- Per-metal cards ----------------------- */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          By metal
        </h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {METAL_ORDER.map((metal) => (
            <MetalCard key={metal} metal={metal} slice={snapshot.by_metal[metal]} spot={spotMap[metal]} />
          ))}
        </div>
        {snapshot.non_metal.count > 0 && (
          <p className="mt-2 text-[11px] text-warmgrey">
            {snapshot.non_metal.count} non-metal item
            {snapshot.non_metal.count === 1 ? '' : 's'} (watches / handbags) valued at cost{' '}
            <span className="text-white">{formatGBP(snapshot.non_metal.total_cost_gbp)}</span>{' '}
            - not included in the live revaluation above.
          </p>
        )}
      </section>

      {/* ----------------------------- Reports --------------------- */}
      <ReportsBar items={items} />

      {/* ----------------------------- Add + search bar --------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stock #, metal, description…"
          className="min-w-[220px] flex-1 rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
        <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
          {filtered.length} of {items.length}
        </span>
        {selectedItems.length > 0 && (
          <button
            type="button"
            onClick={() => setSelling(true)}
            className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-emerald-200 transition hover:bg-emerald-500/25"
          >
            Mark {selectedItems.length} as sold
          </button>
        )}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright"
        >
          {adding ? 'Close' : 'Add item'}
        </button>
      </div>

      {adding && (
        <AddItemForm
          onCreated={(item) => {
            setItems((prev) => [item, ...prev]);
            setAdding(false);
          }}
        />
      )}

      {selling && selectedItems.length > 0 && (
        <SaleModal items={selectedItems} onClose={() => setSelling(false)} />
      )}

      {/* ----------------------------- Holdings table ----------------------- */}
      <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="w-8 px-3 py-2 text-left">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-2 py-2 text-left">Stock #</th>
              <th className="px-2 py-2 text-left">Item</th>
              <th className="px-2 py-2 text-right">Weight</th>
              <th className="px-2 py-2 text-right">Cost</th>
              <th className="px-2 py-2 text-right">Current</th>
              <th className="px-2 py-2 text-right">P&amp;L</th>
              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-warmgrey">
                  {items.length === 0
                    ? 'No holdings yet - add one above, or import from a paid valuation request.'
                    : 'No items match that search.'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const kids = childrenByParent[item.id] ?? [];
                if (item.status === 'split') {
                  const open = openParents.has(item.id);
                  return (
                    <SplitParentRows
                      key={item.id}
                      parent={item}
                      pieces={kids}
                      open={open}
                      onToggle={() =>
                        setOpenParents((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                      selected={selected}
                      onSelect={toggle}
                      spotMap={spotMap}
                    />
                  );
                }
                return (
                  <HoldingRow
                    key={item.id}
                    item={item}
                    spotMap={spotMap}
                    checked={selected.has(item.id)}
                    onCheck={() => toggle(item.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-warmgrey/70">
        Tick items to sell them together on one invoice. Bulk purchases can be broken into
        individual pieces with Split - each piece gets its own CG code and stays linked to the
        original purchase.
      </p>
    </div>
  );
}

/* --------------------------------------------------------- Split parent */

function SplitParentRows({
  parent,
  pieces,
  open,
  onToggle,
  selected,
  onSelect,
  spotMap,
}: {
  parent: StockItem;
  pieces: StockItem[];
  open: boolean;
  onToggle: () => void;
  selected: Set<string>;
  onSelect: (id: string) => void;
  spotMap: Record<MetalKey, number | null>;
}) {
  const original = Number(parent.weight_grams) || 0;
  const allocated = allocatedWeight(pieces);
  const remaining = remainingWeight(parent, pieces);
  const complete = Math.abs(remaining) <= 0.0005;
  const held = pieces.filter((p) => p.status === 'held').length;
  const sold = pieces.filter((p) => p.status === 'sold').length;

  return (
    <>
      <tr className="bg-ink-900/30 align-top">
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            title={open ? 'Collapse pieces' : 'Show pieces'}
            className="text-warmgrey hover:text-gold-bright"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" className={'transition-transform ' + (open ? 'rotate-90' : '')} aria-hidden>
              <path d="M3 1.5 7 5 3 8.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </td>
        <td className="whitespace-nowrap px-2 py-2.5">
          <Link href={`/admin/holdings/${parent.id}`} className="font-mono text-[12px] font-medium text-white hover:text-gold-bright">
            {parent.stock_number}
          </Link>
          <div className="text-[10px] text-warmgrey">{new Date(parent.acquired_at).toLocaleDateString('en-GB')}</div>
          <span className="mt-0.5 inline-block rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-violet-300">
            Bulk · split
          </span>
        </td>
        <td className="px-2 py-2.5">
          <div className="text-[12px] text-white">
            {[parent.metal_type, parent.carat, parent.item_type].filter(Boolean).join(' · ') || 'Bulk holding'}
          </div>
          {parent.description && <div className="line-clamp-1 text-[11px] text-warmgrey">{parent.description}</div>}
          <div className={'mt-0.5 text-[11px] ' + (complete ? 'text-emerald-300' : 'text-amber-300')}>
            {fmtG(allocated)} allocated / {fmtG(original)} purchased
            {!complete && <> · {fmtG(remaining)} remaining</>}
            <span className="ml-2 text-warmgrey">
              {pieces.length} piece{pieces.length === 1 ? '' : 's'}
              {sold > 0 && <> · {sold} sold</>}
              {held > 0 && <> · {held} held</>}
            </span>
          </div>
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">{fmtG(original)}</td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
          {formatGBP(Number(parent.acquired_paid_gbp) || 0)}
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-warmgrey" colSpan={2}>
          {complete ? 'valued via pieces' : `${fmtG(remaining)} unallocated`}
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 text-right text-[10px] uppercase tracking-luxe">
          <Link href={`/admin/holdings/${parent.id}?mode=split`} className="text-gold-metallic/70 hover:text-gold-bright">
            Split
          </Link>
        </td>
      </tr>
      {open &&
        pieces.map((p) => (
          <HoldingRow
            key={p.id}
            item={p}
            spotMap={spotMap}
            checked={selected.has(p.id)}
            onCheck={() => onSelect(p.id)}
            nested
          />
        ))}
    </>
  );
}

/* ---------------------------------------------------------------- Reports */

type RangePreset = 'today' | 'yesterday' | '7d' | '30d';

const RANGE_LABEL: Record<RangePreset, string> = {
  today: 'today',
  yesterday: 'yesterday',
  '7d': 'last 7 days',
  '30d': 'last 30 days',
};

function rangeFor(preset: RangePreset): { from: Date; to: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7d': {
      const f = new Date(now);
      f.setDate(f.getDate() - 7);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
    case '30d': {
      const f = new Date(now);
      f.setDate(f.getDate() - 30);
      return { from: startOfDay(f), to: endOfDay(now) };
    }
  }
}

function ReportsBar({ items }: { items: StockItem[] }) {
  const [range, setRange] = useState<RangePreset>('7d');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const exportHeld = () => {
    setFeedback(null);
    downloadCsv(buildHoldingsHeldCsv(items), `holdings-held-${stamp()}.csv`);
  };

  const exportAcquisitions = () => {
    setFeedback(null);
    const { from, to } = rangeFor(range);
    startTransition(async () => {
      const result = await fetchAcquisitionsInRange(from.toISOString(), to.toISOString());
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      const data = result.data ?? [];
      if (data.length === 0) {
        setFeedback(`No acquisitions in ${RANGE_LABEL[range]}.`);
        return;
      }
      downloadCsv(buildHoldingsAcquisitionsCsv(data), `holdings-acquisitions-${range}-${stamp()}.csv`);
    });
  };

  const exportSales = () => {
    setFeedback(null);
    const { from, to } = rangeFor(range);
    startTransition(async () => {
      const result = await fetchSalesInRange(from.toISOString(), to.toISOString());
      if (!result.ok) {
        setFeedback(result.error);
        return;
      }
      const data = result.data ?? [];
      if (data.length === 0) {
        setFeedback(`No sales in ${RANGE_LABEL[range]}.`);
        return;
      }
      downloadCsv(buildHoldingsSalesCsv(data), `holdings-sales-${range}-${stamp()}.csv`);
    });
  };

  return (
    <section className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Reconciliation
          </h2>
          <p className="mt-1 text-[11px] text-warmgrey">
            Export ledger slices as CSV - opens cleanly in Excel and Sheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] uppercase tracking-luxe text-warmgrey">
            Range
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as RangePreset)}
              className="ml-2 rounded-md border border-gold-metallic/20 bg-ink-950/60 px-2 py-1 text-[11px] text-white focus:border-gold-metallic focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>
          <button type="button" onClick={exportAcquisitions} disabled={pending} className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-50">
            {pending ? '…' : 'Acquisitions'}
          </button>
          <button type="button" onClick={exportSales} disabled={pending} className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-50">
            {pending ? '…' : 'Sales'}
          </button>
          <button type="button" onClick={exportHeld} className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15">
            Held snapshot
          </button>
        </div>
      </div>
      {feedback && <p className="mt-2 text-[11px] text-amber-400">{feedback}</p>}
    </section>
  );
}

function stamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/* --------------------------------------------------------------- Stat cards */

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{label}</div>
      <div className={'mt-2 font-display text-xl ' + (tone === 'negative' ? 'text-red-300' : tone === 'positive' ? 'text-emerald-300' : 'text-white')}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-warmgrey">{sub}</div>}
    </div>
  );
}

function MetalCard({ metal, slice, spot }: { metal: MetalKey; slice: PortfolioSlice; spot: number | null }) {
  const empty = slice.count === 0;
  return (
    <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{METAL_LABELS[metal]}</span>
        <span className="text-[10px] text-warmgrey">{spot ? `Spot ${formatGBP(spot)}/g` : 'No spot'}</span>
      </div>
      {empty ? (
        <p className="mt-2 text-[12px] text-warmgrey">No holdings.</p>
      ) : (
        <>
          <div className="mt-2 font-display text-lg text-white">{formatGBP(slice.total_current_value_gbp)}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 text-[11px] text-warmgrey">
            <span>{slice.count} item{slice.count === 1 ? '' : 's'}</span>
            <span className="text-right">{slice.total_weight_grams.toFixed(1)}g</span>
            <span>Cost {formatGBP(slice.total_cost_gbp)}</span>
            <span className={'text-right ' + (slice.pl_gbp >= 0 ? 'text-emerald-300' : 'text-red-300')}>
              {formatGBP(slice.pl_gbp, true)} · {formatPct(slice.pl_pct)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- Row */

function HoldingRow({
  item,
  spotMap,
  checked,
  onCheck,
  nested = false,
}: {
  item: StockItem;
  spotMap: Record<MetalKey, number | null>;
  checked: boolean;
  onCheck: () => void;
  /** A piece listed under its bulk parent. */
  nested?: boolean;
}) {
  const live = liveValueFor(item, spotMap);
  const cost = Number(item.acquired_paid_gbp) || 0;
  const pl = live != null ? live - cost : null;
  const plPct = live != null && cost > 0 ? (pl! / cost) * 100 : null;
  const sellable = item.status === 'held';

  return (
    <tr className={'align-top hover:bg-ink-900/40 ' + (nested ? 'bg-ink-950/40' : '')}>
      <td className={'px-3 py-2.5 ' + (nested ? 'pl-6' : '')}>
        {sellable ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheck}
            aria-label={`Select ${item.stock_number}`}
            className="h-3.5 w-3.5 accent-gold-metallic"
          />
        ) : (
          <span className="block h-3.5 w-3.5" />
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5">
        <Link href={`/admin/holdings/${item.id}`} className="font-mono text-[12px] font-medium text-white hover:text-gold-bright">
          {nested && <span className="mr-1 text-warmgrey/60">└</span>}
          {item.stock_number}
        </Link>
        <div className="text-[10px] text-warmgrey">{new Date(item.acquired_at).toLocaleDateString('en-GB')}</div>
        {item.status === 'sold' && (
          <span className="mt-0.5 inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-emerald-300">
            Sold
          </span>
        )}
      </td>
      <td className="px-2 py-2.5">
        <div className="text-[12px] text-white">
          {[item.metal_type, item.carat, item.item_type].filter(Boolean).join(' · ') || 'Item'}
        </div>
        {item.description && <div className="line-clamp-1 text-[11px] text-warmgrey">{item.description}</div>}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
        {item.weight_grams ? fmtG(Number(item.weight_grams)) : '—'}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">{formatGBP(cost)}</td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
        {item.status === 'sold' ? (
          <span className="text-warmgrey">{formatGBP(Number(item.sold_amount_gbp) || 0)} sold</span>
        ) : live != null ? (
          formatGBP(live)
        ) : (
          <span className="cursor-help text-warmgrey/70" title="Live pricing needs metal, weight and carat/purity - click Edit to fill in what's missing.">
            —
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px]">
        {item.status === 'sold' ? (
          (() => {
            const realised = (Number(item.sold_amount_gbp) || 0) - cost;
            return <span className={realised >= 0 ? 'text-emerald-300' : 'text-red-300'}>{formatGBP(realised, true)}</span>;
          })()
        ) : pl == null ? (
          <span className="text-warmgrey/70">—</span>
        ) : (
          <span className={pl >= 0 ? 'text-emerald-300' : 'text-red-300'}>
            {formatGBP(pl, true)}
            {plPct != null && <span className="ml-1 text-[10px] text-warmgrey">({formatPct(plPct)})</span>}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[10px] uppercase tracking-luxe">
        <span className="inline-flex gap-2">
          <Link href={`/admin/holdings/${item.id}`} className="text-gold-metallic/70 hover:text-gold-bright">
            Open
          </Link>
          {canSplit(item) && (
            <Link href={`/admin/holdings/${item.id}?mode=split`} className="text-gold-metallic/70 hover:text-gold-bright">
              Split
            </Link>
          )}
        </span>
      </td>
    </tr>
  );
}

function liveValueFor(item: StockItem, spotMap: Record<MetalKey, number | null>): number | null {
  const metal = item.metal_type?.toLowerCase() ?? '';
  let key: MetalKey | null = null;
  if (metal.includes('gold')) key = 'gold';
  else if (metal.includes('silver')) key = 'silver';
  else if (metal.includes('platinum')) key = 'platinum';
  else if (metal.includes('palladium')) key = 'palladium';
  if (!key) return null;
  const spot = spotMap[key];
  if (!spot) return null;
  const weight = Number(item.weight_grams) || 0;
  const purity = Number(item.purity_percentage) || 0;
  if (weight <= 0 || purity <= 0) return null;
  return weight * (purity / 100) * spot;
}

/* ------------------------------------------------------------ Add form */

function AddItemForm({ onCreated }: { onCreated: (item: StockItem) => void }) {
  const [form, setForm] = useState({
    metal_type: 'Gold' as (typeof METAL_OPTIONS)[number] | '',
    carat: '22ct' as string,
    weight_grams: '',
    acquired_paid_gbp: '',
    item_type: '',
    description: '',
    notes: '',
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value as (typeof form)[K] }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const carat = form.carat || null;
    const purity = purityToPercent(carat);
    if (form.metal_type && !carat) {
      setFeedback({
        ok: false,
        text: 'Pick a carat/purity - a metal item needs one to be priced. Use metal "(none)" for watches and handbags.',
      });
      return;
    }
    startTransition(async () => {
      const result = await createStockItem({
        metal_type: form.metal_type || null,
        carat,
        purity_percentage: purity,
        weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
        acquired_paid_gbp: Number(form.acquired_paid_gbp || 0),
        item_type: form.item_type || null,
        description: form.description || null,
        notes: form.notes || null,
      });
      if (result.ok && result.data) {
        onCreated(result.data);
        setFeedback({ ok: true, text: `Added ${result.data.stock_number}.` });
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gold-metallic/25 bg-ink-900/70 p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Add holding manually</h2>
      <p className="text-[11px] text-warmgrey">
        Use this for walk-ins. Existing valuation requests with a payment can be imported with one
        click from the Valuation Requests page.
      </p>

      <div className="grid gap-3 md:grid-cols-4">
        <SelectField label="Metal" value={form.metal_type} onChange={update('metal_type')}>
          <option value="">(none)</option>
          {METAL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </SelectField>
        <SelectField label="Carat / purity" value={form.carat} onChange={update('carat')}>
          <option value="">(n/a)</option>
          <optgroup label="Gold">
            {HOLDINGS_CARAT_OPTIONS.filter((c) => c.endsWith('ct')).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </optgroup>
          <optgroup label="Silver">
            {HOLDINGS_CARAT_OPTIONS.filter((c) => c.endsWith('silver')).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </optgroup>
          <optgroup label="Platinum">
            {HOLDINGS_CARAT_OPTIONS.filter((c) => c.endsWith('platinum')).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </optgroup>
        </SelectField>
        <NumField label="Weight (g)" value={form.weight_grams} onChange={update('weight_grams')} step="0.001" />
        <NumField label="Paid (£)" value={form.acquired_paid_gbp} onChange={update('acquired_paid_gbp')} step="0.01" required />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Item type" value={form.item_type} onChange={update('item_type')} placeholder="ring, chain, watch…" />
        <TextField label="Description" value={form.description} onChange={update('description')} placeholder="brand, model, distinguishing details" />
      </div>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">Notes (optional)</span>
        <textarea
          value={form.notes}
          onChange={update('notes')}
          rows={2}
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {feedback ? (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>{feedback.text}</p>
        ) : (
          <p className="text-[11px] text-warmgrey/70">Live spot will be stamped automatically based on the metal.</p>
        )}
        <button
          type="submit"
          disabled={pending || !form.acquired_paid_gbp}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add to holdings'}
        </button>
      </div>
    </form>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

function NumField({ label, value, onChange, step, required }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        required={required}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, children }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

/* --------------------------------------------------------------- Format */

function fmtG(n: number): string {
  return `${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}g`;
}

function formatGBP(n: number, withSign = false): string {
  const sign = withSign && n > 0 ? '+' : '';
  return `${sign}£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

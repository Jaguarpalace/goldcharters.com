'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { StockItem } from '@/types/database';
import {
  createStockItem,
  fetchAcquisitionsInRange,
  fetchSalesInRange,
} from '@/lib/actions/stockItems';
import type {
  MetalKey,
  PortfolioSlice,
  PortfolioSnapshot,
} from '@/lib/queries/stockItems';
import {
  buildHoldingsAcquisitionsCsv,
  buildHoldingsHeldCsv,
  buildHoldingsSalesCsv,
  downloadCsv,
} from './csv';

const METAL_ORDER: MetalKey[] = ['gold', 'silver', 'platinum', 'palladium'];
const METAL_LABELS: Record<MetalKey, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
};
const METAL_OPTIONS = ['Gold', 'Silver', 'Platinum', 'Palladium'] as const;
const CARAT_OPTIONS = ['9ct', '14ct', '18ct', '22ct', '24ct'] as const;
const CARAT_TO_PURITY: Record<(typeof CARAT_OPTIONS)[number], number> = {
  '9ct': 37.5,
  '14ct': 58.5,
  '18ct': 75.0,
  '22ct': 91.6,
  '24ct': 99.9,
};

export function HoldingsBoard({
  initialItems,
  snapshot,
  spotMap,
}: {
  initialItems: StockItem[];
  snapshot: PortfolioSnapshot;
  spotMap: Record<MetalKey, number | null>;
}) {
  const [items, setItems] = useState<StockItem[]>(initialItems);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      const hay = [
        i.stock_number,
        i.item_type,
        i.metal_type,
        i.carat,
        i.description,
        i.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  return (
    <div className="space-y-6">
      {/* ----------------------------- Combined totals ----------------------- */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Portfolio
        </h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Items held" value={snapshot.combined.count.toString()} />
          <StatCard
            label="Cost basis"
            value={formatGBP(snapshot.combined.total_cost_gbp)}
          />
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
            label="Unrealised P&L"
            value={`${formatGBP(snapshot.combined.pl_gbp, true)} · ${formatPct(snapshot.combined.pl_pct)}`}
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
            <MetalCard
              key={metal}
              metal={metal}
              slice={snapshot.by_metal[metal]}
              spot={spotMap[metal]}
            />
          ))}
        </div>
        {snapshot.non_metal.count > 0 && (
          <p className="mt-2 text-[11px] text-warmgrey">
            {snapshot.non_metal.count} non-metal item
            {snapshot.non_metal.count === 1 ? '' : 's'} (watches / handbags) valued at cost{' '}
            <span className="text-white">{formatGBP(snapshot.non_metal.total_cost_gbp)}</span>{' '}
            — not included in the live revaluation above.
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

      {/* ----------------------------- Holdings table ----------------------- */}
      <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-3 py-2 text-left">Stock #</th>
              <th className="px-2 py-2 text-left">Item</th>
              <th className="px-2 py-2 text-right">Weight</th>
              <th className="px-2 py-2 text-right">Cost</th>
              <th className="px-2 py-2 text-right">Current</th>
              <th className="px-2 py-2 text-right">P&amp;L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-warmgrey">
                  {items.length === 0
                    ? 'No holdings yet — add one above, or import from a paid valuation request.'
                    : 'No items match that search.'}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <HoldingRow key={item.id} item={item} spotMap={spotMap} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
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
    const csv = buildHoldingsHeldCsv(items);
    downloadCsv(csv, `holdings-held-${stamp()}.csv`);
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
      downloadCsv(
        buildHoldingsAcquisitionsCsv(data),
        `holdings-acquisitions-${range}-${stamp()}.csv`,
      );
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
            Export ledger slices as CSV — opens cleanly in Excel and Sheets.
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
          <button
            type="button"
            onClick={exportAcquisitions}
            disabled={pending}
            className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-50"
          >
            {pending ? '…' : 'Acquisitions'}
          </button>
          <button
            type="button"
            onClick={exportSales}
            disabled={pending}
            className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-50"
          >
            {pending ? '…' : 'Sales'}
          </button>
          <button
            type="button"
            onClick={exportHeld}
            className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15"
          >
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
      <div className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        {label}
      </div>
      <div
        className={
          'mt-2 font-display text-xl ' +
          (tone === 'negative'
            ? 'text-red-300'
            : tone === 'positive'
            ? 'text-emerald-300'
            : 'text-white')
        }
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-warmgrey">{sub}</div>}
    </div>
  );
}

function MetalCard({
  metal,
  slice,
  spot,
}: {
  metal: MetalKey;
  slice: PortfolioSlice;
  spot: number | null;
}) {
  const empty = slice.count === 0;
  return (
    <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          {METAL_LABELS[metal]}
        </span>
        <span className="text-[10px] text-warmgrey">
          {spot ? `Spot ${formatGBP(spot)}/g` : 'No spot'}
        </span>
      </div>
      {empty ? (
        <p className="mt-2 text-[12px] text-warmgrey">No holdings.</p>
      ) : (
        <>
          <div className="mt-2 font-display text-lg text-white">
            {formatGBP(slice.total_current_value_gbp)}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 text-[11px] text-warmgrey">
            <span>
              {slice.count} item{slice.count === 1 ? '' : 's'}
            </span>
            <span className="text-right">{slice.total_weight_grams.toFixed(1)}g</span>
            <span>Cost {formatGBP(slice.total_cost_gbp)}</span>
            <span
              className={
                'text-right ' +
                (slice.pl_gbp >= 0 ? 'text-emerald-300' : 'text-red-300')
              }
            >
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
}: {
  item: StockItem;
  spotMap: Record<MetalKey, number | null>;
}) {
  const live = liveValueFor(item, spotMap);
  const cost = Number(item.acquired_paid_gbp) || 0;
  const pl = live != null ? live - cost : null;
  const plPct = live != null && cost > 0 ? (pl! / cost) * 100 : null;

  return (
    <tr className="align-top hover:bg-ink-900/40">
      <td className="whitespace-nowrap px-3 py-2.5">
        <Link
          href={`/admin/holdings/${item.id}`}
          className="font-mono text-[12px] font-medium text-white hover:text-gold-bright"
        >
          {item.stock_number}
        </Link>
        <div className="text-[10px] text-warmgrey">
          {new Date(item.acquired_at).toLocaleDateString('en-GB')}
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="text-[12px] text-white">
          {[item.metal_type, item.carat, item.item_type].filter(Boolean).join(' · ') ||
            'Item'}
        </div>
        {item.description && (
          <div className="line-clamp-1 text-[11px] text-warmgrey">{item.description}</div>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
        {item.weight_grams ? `${Number(item.weight_grams).toFixed(2)}g` : '—'}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
        {formatGBP(cost)}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px] text-white">
        {live != null ? formatGBP(live) : <span className="text-warmgrey/70">—</span>}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right text-[12px]">
        {pl == null ? (
          <span className="text-warmgrey/70">—</span>
        ) : (
          <span className={pl >= 0 ? 'text-emerald-300' : 'text-red-300'}>
            {formatGBP(pl, true)}
            {plPct != null && (
              <span className="ml-1 text-[10px] text-warmgrey">
                ({formatPct(plPct)})
              </span>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

function liveValueFor(
  item: StockItem,
  spotMap: Record<MetalKey, number | null>,
): number | null {
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
    carat: '22ct' as (typeof CARAT_OPTIONS)[number] | '',
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
    const purity = carat && carat in CARAT_TO_PURITY ? CARAT_TO_PURITY[carat] : null;

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
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border border-gold-metallic/25 bg-ink-900/70 p-5"
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        Add holding manually
      </h2>
      <p className="text-[11px] text-warmgrey">
        Use this for walk-ins. Existing valuation requests with a payment can be imported with
        one click from the Valuation Requests page.
      </p>

      <div className="grid gap-3 md:grid-cols-4">
        <SelectField label="Metal" value={form.metal_type} onChange={update('metal_type')}>
          <option value="">(none)</option>
          {METAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </SelectField>
        <SelectField label="Carat" value={form.carat} onChange={update('carat')}>
          <option value="">(n/a)</option>
          {CARAT_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <NumField
          label="Weight (g)"
          value={form.weight_grams}
          onChange={update('weight_grams')}
          step="0.001"
        />
        <NumField
          label="Paid (£)"
          value={form.acquired_paid_gbp}
          onChange={update('acquired_paid_gbp')}
          step="0.01"
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Item type"
          value={form.item_type}
          onChange={update('item_type')}
          placeholder="ring, chain, watch…"
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={update('description')}
          placeholder="brand, model, distinguishing details"
        />
      </div>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Notes (optional)
        </span>
        <textarea
          value={form.notes}
          onChange={update('notes')}
          rows={2}
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {feedback ? (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        ) : (
          <p className="text-[11px] text-warmgrey/70">
            Live spot will be stamped automatically based on the metal.
          </p>
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

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
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

function NumField({
  label,
  value,
  onChange,
  step,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
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

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
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

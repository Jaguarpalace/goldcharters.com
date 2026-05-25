'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Customer, StockItem } from '@/types/database';
import {
  deleteStockItem,
  recordStockItemSale,
  unmarkStockItemSale,
  updateStockItem,
} from '@/lib/actions/stockItems';
import type { MetalKey } from '@/lib/queries/stockItems';

const METAL_OPTIONS = ['', 'Gold', 'Silver', 'Platinum', 'Palladium'] as const;
const CARAT_OPTIONS = ['', '9ct', '14ct', '18ct', '22ct', '24ct'] as const;

export function HoldingDetail({
  item,
  customer,
  spotMap,
}: {
  item: StockItem;
  customer: Customer | null;
  spotMap: Record<MetalKey, number | null>;
}) {
  const router = useRouter();
  const sold = item.status === 'sold';
  const liveValue = liveValueFor(item, spotMap);
  const cost = Number(item.acquired_paid_gbp) || 0;
  const acquiredSpot = item.acquired_spot_gbp_per_g
    ? Number(item.acquired_spot_gbp_per_g)
    : null;
  const acquiredSpotValue = computeSpotValue(item, acquiredSpot);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-5">
        <DetailsForm item={item} disabled={sold} />
        {sold ? (
          <SaleSummary item={item} onUnmark={() => router.refresh()} />
        ) : (
          <SalePanel item={item} onSold={() => router.refresh()} />
        )}
      </div>

      <aside className="space-y-4">
        <Panel title="Acquisition">
          <Row label="Date" value={new Date(item.acquired_at).toLocaleString('en-GB')} />
          <Row label="Paid" value={formatGBP(cost)} />
          <Row
            label="Spot at purchase"
            value={
              acquiredSpot
                ? `${formatGBP(acquiredSpot, false, 4)}/g`
                : '—'
            }
          />
          {acquiredSpotValue != null && (
            <Row
              label="Implied value at purchase"
              value={formatGBP(acquiredSpotValue)}
              hint={`${pctBelowSpot(cost, acquiredSpotValue)} below spot`}
            />
          )}
        </Panel>

        {!sold && (
          <Panel title="Live valuation">
            {liveValue != null ? (
              <>
                <Row label="Current value" value={formatGBP(liveValue)} emphasis />
                <Row
                  label="Unrealised P&L"
                  value={`${formatGBP(liveValue - cost, true)} (${formatPct(((liveValue - cost) / cost) * 100)})`}
                  tone={liveValue >= cost ? 'positive' : 'negative'}
                />
              </>
            ) : (
              <p className="text-[12px] text-warmgrey">
                Live revaluation needs metal, weight and purity. Non-metal items show at cost on
                the dashboard.
              </p>
            )}
          </Panel>
        )}

        <Panel title="Source">
          {item.valuation_request_id ? (
            <p className="text-[12px] text-warmgrey">
              Imported from valuation request{' '}
              <Link
                href="/admin/valuation-requests"
                className="text-gold-tint hover:text-gold-bright"
              >
                #{item.valuation_request_id.slice(0, 8)}
              </Link>
              .
            </p>
          ) : (
            <p className="text-[12px] text-warmgrey">Added manually (walk-in).</p>
          )}
          {customer ? (
            <p className="mt-2 text-[12px] text-warmgrey">
              Seller:{' '}
              <Link
                href={`/admin/customers/${customer.id}`}
                className="text-gold-tint hover:text-gold-bright"
              >
                {customer.first_name} {customer.last_name}
              </Link>
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-warmgrey/70">No customer record linked.</p>
          )}
        </Panel>

        <DangerZone id={item.id} />
      </aside>
    </div>
  );
}

/* --------------------------------------------------------------- Details */

function DetailsForm({ item, disabled }: { item: StockItem; disabled: boolean }) {
  const [form, setForm] = useState({
    metal_type: item.metal_type ?? '',
    carat: item.carat ?? '',
    purity_percentage: item.purity_percentage?.toString() ?? '',
    weight_grams: item.weight_grams?.toString() ?? '',
    item_type: item.item_type ?? '',
    description: item.description ?? '',
    notes: item.notes ?? '',
    acquired_paid_gbp: item.acquired_paid_gbp?.toString() ?? '',
    acquired_at: toLocalDateTime(item.acquired_at),
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value as (typeof form)[K] }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await updateStockItem(item.id, {
        metal_type: form.metal_type || null,
        carat: form.carat || null,
        purity_percentage: form.purity_percentage ? Number(form.purity_percentage) : null,
        weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
        item_type: form.item_type || null,
        description: form.description || null,
        notes: form.notes || null,
        acquired_paid_gbp: Number(form.acquired_paid_gbp || 0),
        acquired_at: form.acquired_at ? new Date(form.acquired_at).toISOString() : null,
      });
      if (result.ok) {
        setFeedback({ ok: true, text: 'Saved.' });
        setTimeout(() => setFeedback(null), 2000);
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-lg border border-gold-metallic/15 p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        Item details
      </h2>
      {disabled && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          This item is sold. Unmark the sale below to edit the underlying details again.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Select
          label="Metal"
          value={form.metal_type}
          onChange={update('metal_type')}
          disabled={disabled}
        >
          {METAL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m || '(none)'}
            </option>
          ))}
        </Select>
        <Select label="Carat" value={form.carat} onChange={update('carat')} disabled={disabled}>
          {CARAT_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c || '(n/a)'}
            </option>
          ))}
        </Select>
        <NumberField
          label="Purity %"
          value={form.purity_percentage}
          onChange={update('purity_percentage')}
          step="0.01"
          disabled={disabled}
        />
        <NumberField
          label="Weight (g)"
          value={form.weight_grams}
          onChange={update('weight_grams')}
          step="0.001"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField
          label="Item type"
          value={form.item_type}
          onChange={update('item_type')}
          disabled={disabled}
        />
        <TextField
          label="Description"
          value={form.description}
          onChange={update('description')}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NumberField
          label="Paid (£)"
          value={form.acquired_paid_gbp}
          onChange={update('acquired_paid_gbp')}
          step="0.01"
          disabled={disabled}
        />
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
            Acquired at
          </span>
          <input
            type="datetime-local"
            disabled={disabled}
            value={form.acquired_at}
            onChange={update('acquired_at')}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:border-gold-metallic focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Notes
        </span>
        <textarea
          disabled={disabled}
          value={form.notes}
          onChange={update('notes')}
          rows={3}
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || disabled}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        {feedback && (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        )}
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- Sale */

function SalePanel({
  item,
  onSold,
}: {
  item: StockItem;
  onSold: () => void;
}) {
  const [form, setForm] = useState({
    sold_to_name: '',
    sold_to_email: '',
    sold_amount_gbp: '',
    sold_at: toLocalDateTime(new Date().toISOString()),
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await recordStockItemSale(item.id, {
        sold_to_name: form.sold_to_name || null,
        sold_to_email: form.sold_to_email || null,
        sold_amount_gbp: Number(form.sold_amount_gbp || 0),
        sold_at: form.sold_at ? new Date(form.sold_at).toISOString() : null,
      });
      if (result.ok) {
        setFeedback({ ok: true, text: 'Sale recorded.' });
        onSold();
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gold-metallic/15 p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        Record sale
      </h2>
      <p className="text-[11px] text-warmgrey">
        Live spot is stamped automatically against the metal at the moment you save, so the
        sale margin is locked in for reporting.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Buyer name" value={form.sold_to_name} onChange={update('sold_to_name')} />
        <TextField
          label="Buyer email"
          type="email"
          value={form.sold_to_email}
          onChange={update('sold_to_email')}
        />
        <NumberField
          label="Sale amount (£)"
          value={form.sold_amount_gbp}
          onChange={update('sold_amount_gbp')}
          step="0.01"
          required
        />
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
            Sold at
          </span>
          <input
            type="datetime-local"
            value={form.sold_at}
            onChange={update('sold_at')}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        {feedback ? (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending || !form.sold_amount_gbp}
          className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Mark as sold'}
        </button>
      </div>
    </form>
  );
}

function SaleSummary({ item, onUnmark }: { item: StockItem; onUnmark: () => void }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const cost = Number(item.acquired_paid_gbp) || 0;
  const sold = Number(item.sold_amount_gbp) || 0;
  const pl = sold - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;

  const unmark = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await unmarkStockItemSale(item.id);
      if (result.ok) onUnmark();
      else setFeedback(result.error);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-gold-metallic/15 p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        Sale
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <Row label="Buyer" value={item.sold_to_name || '—'} />
        <Row label="Buyer email" value={item.sold_to_email || '—'} />
        <Row
          label="Sold at"
          value={item.sold_at ? new Date(item.sold_at).toLocaleString('en-GB') : '—'}
        />
        <Row
          label="Spot at sale"
          value={
            item.sold_spot_gbp_per_g
              ? `${formatGBP(Number(item.sold_spot_gbp_per_g), false, 4)}/g`
              : '—'
          }
        />
        <Row label="Sale amount" value={formatGBP(sold)} emphasis />
        <Row
          label="Realised P&L"
          value={`${formatGBP(pl, true)} (${formatPct(plPct)})`}
          tone={pl >= 0 ? 'positive' : 'negative'}
        />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        {feedback && <p className="text-[11px] text-amber-400">{feedback}</p>}
        <button
          type="button"
          onClick={unmark}
          disabled={pending}
          className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright disabled:opacity-50"
        >
          {pending ? 'Reverting…' : 'Unmark sale'}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Danger zone */

function DangerZone({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const remove = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteStockItem(id);
      if (result.ok) {
        router.push('/admin/holdings');
        router.refresh();
      } else {
        setFeedback(result.error);
        setArmed(false);
      }
    });
  };

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-red-300">
        Danger zone
      </h3>
      <p className="mt-2 text-[11px] text-warmgrey">
        Deleting wipes the stock row entirely. The valuation request and customer it linked to
        are kept.
      </p>
      <div className="mt-2 flex items-center gap-2">
        {armed ? (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20"
            >
              {pending ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              disabled={pending}
              className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
          >
            Delete item
          </button>
        )}
        {feedback && <p className="text-[11px] text-amber-400">{feedback}</p>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Helpers */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-gold-metallic/15 p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
  hint,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  hint?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-luxe text-warmgrey/70">{label}</span>
      <span className="text-right">
        <span
          className={
            'text-[13px] ' +
            (tone === 'negative'
              ? 'text-red-300'
              : tone === 'positive'
              ? 'text-emerald-300'
              : emphasis
              ? 'text-gold-bright'
              : 'text-white')
          }
        >
          {value}
        </span>
        {hint && <div className="text-[10px] text-warmgrey/70">{hint}</div>}
      </span>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  disabled,
  required,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
  disabled?: boolean;
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
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:border-gold-metallic focus:outline-none"
      >
        {children}
      </select>
    </label>
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

function computeSpotValue(item: StockItem, spotPerGram: number | null): number | null {
  if (!spotPerGram) return null;
  const weight = Number(item.weight_grams) || 0;
  const purity = Number(item.purity_percentage) || 0;
  if (weight <= 0 || purity <= 0) return null;
  return weight * (purity / 100) * spotPerGram;
}

function pctBelowSpot(paid: number, spotValue: number): string {
  if (spotValue <= 0) return '—';
  const pct = ((spotValue - paid) / spotValue) * 100;
  return `${pct.toFixed(1)}%`;
}

function formatGBP(n: number, withSign = false, decimals = 2): string {
  const sign = withSign && n > 0 ? '+' : '';
  return `${sign}£${n.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

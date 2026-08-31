'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PurchaseItem } from '@/types/database';
import {
  addPurchaseItem,
  addPurchaseItemToHoldings,
  deletePurchaseItem,
  listPurchaseItems,
  updatePurchaseItem,
  type PurchaseItemInput,
} from '@/lib/actions/purchaseItems';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Draft = {
  description: string;
  metal_type: string;
  carat: string;
  weight_grams: string;
  hallmark: string;
  price_gbp: string;
};

const EMPTY: Draft = { description: '', metal_type: '', carat: '', weight_grams: '', hallmark: '', price_gbp: '' };

function toInput(d: Draft): PurchaseItemInput {
  return {
    description: d.description,
    metal_type: d.metal_type || null,
    carat: d.carat || null,
    weight_grams: d.weight_grams.trim() ? Number(d.weight_grams) : null,
    hallmark: d.hallmark || null,
    price_gbp: Number(d.price_gbp),
  };
}

/**
 * Line-by-line itemisation of a purchase - what the printed Purchase
 * Confirmation lists. Self-contained: loads its own lines by request id so
 * the surrounding detail view stays untouched.
 */
export function ItemisationCard({
  requestId,
  onTotalChange,
}: {
  requestId: string;
  /** Lets the parent offer "use total as payment amount". */
  onTotalChange?: (total: number, count: number) => void;
}) {
  const [items, setItems] = useState<PurchaseItem[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(
    (rows: PurchaseItem[]) => {
      setItems(rows);
      onTotalChange?.(rows.reduce((sum, r) => sum + Number(r.price_gbp), 0), rows.length);
    },
    [onTotalChange],
  );

  useEffect(() => {
    let cancelled = false;
    listPurchaseItems(requestId).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) publish(res.data);
      else setItems([]);
    });
    return () => {
      cancelled = true;
    };
  }, [requestId, publish]);

  const total = (items ?? []).reduce((sum, r) => sum + Number(r.price_gbp), 0);

  const submitAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addPurchaseItem(requestId, toInput(draft));
    if (!res.ok) setError(res.error);
    else if (res.data) {
      publish([...(items ?? []), res.data]);
      setDraft(EMPTY);
      setAdding(false);
    }
    setBusy(false);
  };

  const submitEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setError(null);
    const res = await updatePurchaseItem(editingId, toInput(editDraft));
    if (!res.ok) setError(res.error);
    else if (res.data) {
      publish((items ?? []).map((i) => (i.id === editingId ? res.data! : i)));
      setEditingId(null);
    }
    setBusy(false);
  };

  const remove = async (item: PurchaseItem) => {
    if (!window.confirm(`Remove "${item.description}" from this purchase?`)) return;
    setBusy(true);
    setError(null);
    const res = await deletePurchaseItem(item.id);
    if (!res.ok) setError(res.error);
    else publish((items ?? []).filter((i) => i.id !== item.id));
    setBusy(false);
  };

  const toHoldings = async (item: PurchaseItem) => {
    setBusy(true);
    setError(null);
    const res = await addPurchaseItemToHoldings(item.id);
    if (!res.ok) setError(res.error);
    else if (res.data) {
      publish(
        (items ?? []).map((i) =>
          i.id === item.id ? { ...i, stock_item_id: res.data!.stock_item_id } : i,
        ),
      );
    }
    setBusy(false);
  };

  const startEdit = (item: PurchaseItem) => {
    setEditingId(item.id);
    setEditDraft({
      description: item.description,
      metal_type: item.metal_type ?? '',
      carat: item.carat ?? '',
      weight_grams: item.weight_grams != null ? String(item.weight_grams) : '',
      hallmark: item.hallmark ?? '',
      price_gbp: String(item.price_gbp),
    });
  };

  const fields = (d: Draft, set: (d: Draft) => void) => (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="sm:col-span-2 text-[11px] text-warmgrey">
        Description *
        <input
          className="gc-input mt-1"
          required
          maxLength={500}
          value={d.description}
          onChange={(e) => set({ ...d, description: e.target.value })}
          placeholder="e.g. 9ct gold curb chain"
        />
      </label>
      <label className="text-[11px] text-warmgrey">
        Metal
        <input
          className="gc-input mt-1"
          maxLength={40}
          value={d.metal_type}
          onChange={(e) => set({ ...d, metal_type: e.target.value })}
          placeholder="Gold"
        />
      </label>
      <label className="text-[11px] text-warmgrey">
        Carat / purity
        <input
          className="gc-input mt-1"
          maxLength={20}
          value={d.carat}
          onChange={(e) => set({ ...d, carat: e.target.value })}
          placeholder="9ct"
        />
      </label>
      <label className="text-[11px] text-warmgrey">
        Weight (g)
        <input
          className="gc-input mt-1"
          type="number"
          min="0"
          step="0.01"
          value={d.weight_grams}
          onChange={(e) => set({ ...d, weight_grams: e.target.value })}
        />
      </label>
      <label className="text-[11px] text-warmgrey">
        Hallmark / serial no.
        <input
          className="gc-input mt-1"
          maxLength={200}
          value={d.hallmark}
          onChange={(e) => set({ ...d, hallmark: e.target.value })}
          placeholder="e.g. 375 Birmingham, or serial"
        />
      </label>
      <label className="text-[11px] text-warmgrey">
        Price (£) *
        <input
          className="gc-input mt-1"
          type="number"
          min="0"
          step="0.01"
          required
          value={d.price_gbp}
          onChange={(e) => set({ ...d, price_gbp: e.target.value })}
        />
      </label>
    </div>
  );

  return (
    <div className="rounded-xl border border-gold-metallic/20 bg-ink-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Itemisation
        </h3>
        {items && items.length > 0 && (
          <span className="text-xs text-warmgrey">
            {items.length} item{items.length === 1 ? '' : 's'} ·{' '}
            <strong className="text-gold-bright">{gbp(total)}</strong>
          </span>
        )}
      </div>

      {items === null ? (
        <p className="mt-3 text-xs text-warmgrey">Loading…</p>
      ) : items.length === 0 && !adding ? (
        <p className="mt-3 text-xs text-warmgrey">
          No line items yet. Add each piece bought so the printed agreement lists them one by one.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, idx) =>
            editingId === item.id ? (
              <li key={item.id} className="rounded-lg border border-gold-metallic/30 bg-ink-900/60 p-3">
                <form onSubmit={submitEdit} className="space-y-3">
                  {fields(editDraft, setEditDraft)}
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="gc-btn-primary text-xs">
                      Save item
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="gc-btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-gold-metallic/15 bg-ink-900/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white">
                    <span className="text-warmgrey">{idx + 1}.</span> {item.description}
                  </p>
                  <p className="mt-0.5 text-[11px] text-warmgrey">
                    {[
                      [item.metal_type, item.carat].filter(Boolean).join(' '),
                      item.weight_grams != null ? `${item.weight_grams}g` : null,
                      item.hallmark ? `HM/SN: ${item.hallmark}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gold-bright">{gbp(Number(item.price_gbp))}</span>
                  {item.stock_item_id ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-luxe text-emerald-300">
                      In holdings
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toHoldings(item)}
                      disabled={busy}
                      title="Create a holdings ledger entry for this piece"
                      className="rounded-full border border-gold-metallic/30 px-2 py-0.5 text-[10px] uppercase tracking-luxe text-gold-tint hover:border-gold-metallic hover:text-gold-bright"
                    >
                      → Holdings
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    disabled={busy}
                    className="text-[11px] text-warmgrey hover:text-gold-bright"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={busy}
                    className="text-[11px] text-warmgrey hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </p>
      )}

      {adding ? (
        <form onSubmit={submitAdd} className="mt-3 space-y-3 rounded-lg border border-gold-metallic/30 bg-ink-900/60 p-3">
          {fields(draft, setDraft)}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="gc-btn-primary text-xs">
              {busy ? 'Adding…' : 'Add item'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="gc-btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={busy || items === null}
          className="mt-3 gc-btn-secondary text-xs"
        >
          + Add item
        </button>
      )}
    </div>
  );
}

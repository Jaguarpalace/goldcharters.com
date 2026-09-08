'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Buyer, StockItem } from '@/types/database';
import { searchBuyers } from '@/lib/actions/buyers';
import { createSale } from '@/lib/actions/sales';
import { Typeahead } from './Typeahead';
import {
  BuyerFields,
  EMPTY_BUYER,
  draftToInput,
  type BuyerDraft,
} from '../buyers/BuyerForm';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function toLocalDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The sale flow, start to finish, in one dialog:
 *   pick the buyer (type to find an existing one, or add a new one inline)
 *   -> price each item -> save -> the invoice page opens.
 *
 * Portalled to <body> so it sits above every stacking context on the
 * holdings board and the detail page alike.
 */
export function SaleModal({
  items,
  onClose,
}: {
  /** Held stock rows being sold together on one invoice. */
  items: StockItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [buyerQuery, setBuyerQuery] = useState('');
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<BuyerDraft>(EMPTY_BUYER);
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.id, ''])),
  );
  const [soldAt, setSoldAt] = useState(toLocalDateTime(new Date().toISOString()));
  const [notes, setNotes] = useState('');
  const [completeSource, setCompleteSource] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const subtotal = items.reduce((sum, i) => sum + (Number(prices[i.id]) || 0), 0);
  const allPriced = items.every((i) => prices[i.id] !== '' && Number(prices[i.id]) >= 0);
  const hasBuyer = buyer !== null || (creating && draft.name.trim().length > 0);
  const anySourceRequest = items.some((i) => i.valuation_request_id);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await createSale({
        buyer_id: buyer?.id ?? null,
        new_buyer: !buyer && creating ? draftToInput(draft) : null,
        sold_at: soldAt ? new Date(soldAt).toISOString() : null,
        items: items.map((i) => ({ stock_item_id: i.id, price_gbp: Number(prices[i.id] || 0) })),
        notes: notes || null,
        complete_source_valuations: completeSource,
      });
      if (result.ok && result.data) {
        router.push(`/admin/sales/${result.data.sale.id}`);
        router.refresh();
      } else if (!result.ok) {
        setFeedback(result.error);
      }
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-modal-title"
        className="w-full max-w-3xl space-y-5 rounded-lg border border-gold-metallic/30 bg-ink-950 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="sale-modal-title" className="font-display text-xl text-white">
              Mark as sold
            </h2>
            <p className="mt-1 text-[11px] text-warmgrey">
              {items.length} item{items.length === 1 ? '' : 's'} on one invoice. VAT is 0% on
              these sales, so the total is the sum of the prices.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
          >
            Close
          </button>
        </div>

        {/* ------------------------------------------------ Buyer */}
        <section className="space-y-3 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Who was this sold to?
          </h3>
          {buyer ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold-metallic/30 bg-gold-metallic/10 px-3 py-2">
              <div className="text-sm">
                <span className="font-semibold text-white">{buyer.name}</span>
                <span className="ml-2 text-[11px] text-warmgrey">
                  {[buyer.contact_name, buyer.email, buyer.postcode].filter(Boolean).join(' · ')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuyer(null);
                  setBuyerQuery('');
                }}
                className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
              >
                Change
              </button>
            </div>
          ) : creating ? (
            <div className="space-y-3">
              <p className="text-[11px] text-warmgrey">
                New buyer - saved for next time, so you only type this once.
              </p>
              <BuyerFields draft={draft} onChange={setDraft} compact />
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
              >
                Back to search
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Typeahead<Buyer>
                value={buyerQuery}
                onChange={setBuyerQuery}
                onSelect={(b) => {
                  setBuyer(b);
                  setBuyerQuery('');
                }}
                search={searchBuyers}
                getKey={(b) => b.id}
                minChars={1}
                autoFocus
                placeholder="Start typing a buyer name, contact or email"
                emptyHint="No matching buyer - add a new one below."
                renderItem={(b) => (
                  <div>
                    <div className="text-white">{b.name}</div>
                    <div className="text-[11px] text-warmgrey">
                      {[
                        b.kind === 'business' ? 'Business' : 'Individual',
                        b.contact_name,
                        b.email,
                        b.postcode,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </div>
                )}
              />
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...EMPTY_BUYER, name: buyerQuery.trim() });
                  setCreating(true);
                }}
                className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 hover:text-gold-bright"
              >
                + New buyer{buyerQuery.trim() ? ` "${buyerQuery.trim()}"` : ''}
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------ Items */}
        <section className="space-y-2 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Items and prices
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-[10px] uppercase tracking-luxe text-warmgrey">
                <tr>
                  <th className="py-1.5 text-left">Stock #</th>
                  <th className="py-1.5 text-left">Item</th>
                  <th className="py-1.5 text-right">Weight</th>
                  <th className="py-1.5 text-right">Cost</th>
                  <th className="py-1.5 text-right">Sale price (£)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-metallic/10">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2 font-mono text-[12px] text-white">{i.stock_number}</td>
                    <td className="py-2 text-[12px] text-warmgrey">
                      <div className="text-white">
                        {[i.metal_type, i.carat, i.item_type].filter(Boolean).join(' · ') || 'Item'}
                      </div>
                      {i.description && <div className="line-clamp-1 text-[11px]">{i.description}</div>}
                    </td>
                    <td className="py-2 text-right text-[12px] text-white">
                      {i.weight_grams ? `${Number(i.weight_grams).toFixed(2)}g` : '—'}
                    </td>
                    <td className="py-2 text-right text-[12px] text-warmgrey">
                      {gbp(Number(i.acquired_paid_gbp) || 0)}
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={prices[i.id]}
                        onChange={(e) => setPrices((p) => ({ ...p, [i.id]: e.target.value }))}
                        className="w-32 rounded-md border border-gold-metallic/20 bg-ink-950/60 px-2 py-1.5 text-right text-sm text-white focus:border-gold-metallic focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-[12px]">
                <tr>
                  <td colSpan={4} className="pt-2 text-right text-warmgrey">Subtotal</td>
                  <td className="pt-2 text-right text-white">{gbp(subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="text-right text-warmgrey">VAT 0%</td>
                  <td className="text-right text-white">{gbp(0)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="pt-1 text-right font-semibold text-gold-tint">Total</td>
                  <td className="pt-1 text-right font-semibold text-gold-bright">{gbp(subtotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------ Details */}
        <section className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
              Sold at
            </span>
            <input
              type="datetime-local"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
              Notes for the invoice <span className="ml-1 text-warmgrey/50">(optional)</span>
            </span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. collected in person"
              className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
            />
          </label>
        </section>

        {anySourceRequest && (
          <label className="flex items-start gap-2 rounded-md border border-gold-metallic/15 bg-ink-900/40 p-3 text-[11px] text-warmgrey">
            <input
              type="checkbox"
              checked={completeSource}
              onChange={(e) => setCompleteSource(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 flex-none accent-gold-metallic"
            />
            <span>
              Also mark the original purchase request(s) as <strong>Closed</strong>. Leave unticked
              when other pieces from the same purchase are still in stock.
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {feedback ? (
            <p className="text-[11px] text-amber-400">{feedback}</p>
          ) : (
            <p className="text-[11px] text-warmgrey/70">
              Saving issues the invoice number and opens the invoice.
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !hasBuyer || !allPriced}
            className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save sale & create invoice'}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

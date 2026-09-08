'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type StockItem,
} from '@/types/database';
import { deleteStockItem, unmarkStockItemSale, updateStockItem } from '@/lib/actions/stockItems';
import { voidSale } from '@/lib/actions/sales';
import type { HoldingTrace, MetalKey } from '@/lib/queries/stockItems';
import { allocatedWeight, remainingWeight } from '@/lib/holdings/split';
import { HOLDINGS_CARAT_OPTIONS, purityToPercent } from '@/lib/schemas/valuationFormOptions';
import { SaleModal } from '../../_components/SaleModal';
import { SplitEditor } from '../SplitEditor';

const METAL_OPTIONS = ['', 'Gold', 'Silver', 'Platinum', 'Palladium'] as const;

export function HoldingDetail({
  item,
  trace,
  spotMap,
  startInSplitMode = false,
}: {
  item: StockItem;
  trace: HoldingTrace;
  spotMap: Record<MetalKey, number | null>;
  startInSplitMode?: boolean;
}) {
  const router = useRouter();
  const sold = item.status === 'sold';
  const isSplitParent = item.status === 'split';
  const isPiece = !!item.parent_stock_item_id;
  const splitEligible =
    !isPiece && (item.status === 'held' || item.status === 'split') && (Number(item.weight_grams) || 0) > 0;
  const [splitMode, setSplitMode] = useState(startInSplitMode || isSplitParent);
  const [selling, setSelling] = useState(false);

  const liveValue = liveValueFor(item, spotMap);
  const cost = Number(item.acquired_paid_gbp) || 0;
  const weight = Number(item.weight_grams) || 0;
  const acquiredSpot = item.acquired_spot_gbp_per_g ? Number(item.acquired_spot_gbp_per_g) : null;
  const acquiredSpotValue = computeSpotValue(item, acquiredSpot);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-5">
        <DetailsForm item={item} disabled={sold} />

        {/* ------------------------------------------------ Split */}
        {splitEligible &&
          (splitMode ? (
            <SplitEditor parent={item} initialChildren={trace.children} onChange={() => router.refresh()} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold-metallic/15 p-5">
              <div>
                <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
                  Split holding
                </h2>
                <p className="mt-1 max-w-lg text-[11px] text-warmgrey">
                  Bought as one lot? Break this {fmtG(weight)} holding into the individual pieces
                  it contains. Each gets its own CG stock code, linked back here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSplitMode(true)}
                className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright"
              >
                Enter split mode
              </button>
            </div>
          ))}

        {/* ------------------------------------------------ Sale */}
        {sold ? (
          <SaleSummary item={item} trace={trace} onChanged={() => router.refresh()} />
        ) : isSplitParent ? (
          <div className="rounded-lg border border-gold-metallic/15 p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Sale</h2>
            <p className="mt-2 text-[11px] text-warmgrey">
              This bulk row has been split - sell the individual pieces above. Each piece is
              marked sold on its own invoice line.
            </p>
          </div>
        ) : item.status === 'held' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold-metallic/15 p-5">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
                Record sale
              </h2>
              <p className="mt-1 max-w-lg text-[11px] text-warmgrey">
                Pick the buyer, set the price, and the invoice is issued on save. To sell several
                items on one invoice, tick them on the Holdings page instead.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelling(true)}
              className="rounded-md border border-emerald-500/50 bg-emerald-500/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-emerald-200 transition hover:bg-emerald-500/25"
            >
              Mark as sold
            </button>
          </div>
        ) : null}
        {selling && <SaleModal items={[item]} onClose={() => setSelling(false)} />}
      </div>

      <aside className="space-y-4">
        <Panel title="Acquisition">
          <Row label="Date" value={new Date(item.acquired_at).toLocaleString('en-GB')} />
          <Row label="Paid" value={formatGBP(cost)} />
          {weight > 0 && <Row label="Paid per gram" value={`${formatGBP(cost / weight)}/g`} />}
          <Row label="Spot at purchase" value={acquiredSpot ? `${formatGBP(acquiredSpot, false, 4)}/g` : '—'} />
          {acquiredSpotValue != null && (
            <Row
              label="Implied value at purchase"
              value={formatGBP(acquiredSpotValue)}
              hint={`${pctBelowSpot(cost, acquiredSpotValue)} below spot`}
            />
          )}
        </Panel>

        {!sold && !isSplitParent && (
          <Panel title="Live valuation">
            {liveValue != null ? (
              <>
                <Row label="Current value" value={formatGBP(liveValue)} emphasis />
                <Row
                  label="Variance to spot"
                  value={`${formatGBP(liveValue - cost, true)} (${formatPct(cost > 0 ? ((liveValue - cost) / cost) * 100 : 0)})`}
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

        <ProvenancePanel item={item} trace={trace} />

        <DangerZone id={item.id} />
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------ Provenance */

/**
 * The traceability chain for this CG number:
 *   piece -> bulk holding -> purchase agreement -> seller -> payment,
 * and forward to the invoice once sold. Everything a refinery query needs.
 */
function ProvenancePanel({ item, trace }: { item: StockItem; trace: HoldingTrace }) {
  const { parent, children, request, customer, sale } = trace;
  const ref = request ? request.id.slice(0, 8).toUpperCase() : null;
  const bulkWeight = parent ? Number(parent.weight_grams) || 0 : 0;
  const bulkPaid = parent ? Number(parent.acquired_paid_gbp) || 0 : 0;

  return (
    <Panel title="Provenance">
      {/* Bulk parent */}
      {parent && (
        <Block heading="Part of bulk holding">
          <Link href={`/admin/holdings/${parent.id}`} className="font-mono text-[13px] text-gold-tint hover:text-gold-bright">
            {parent.stock_number}
          </Link>
          <p className="text-[11px] text-warmgrey">
            {[parent.metal_type, parent.carat].filter(Boolean).join(' ')} · {fmtG(bulkWeight)} bought for{' '}
            {formatGBP(bulkPaid)}
            {bulkWeight > 0 && <> ({formatGBP(bulkPaid / bulkWeight)}/g)</>}
          </p>
        </Block>
      )}

      {/* Children */}
      {children.length > 0 && (
        <Block heading={`Split into ${children.length} piece${children.length === 1 ? '' : 's'}`}>
          <p className="text-[11px] text-warmgrey">
            {fmtG(allocatedWeight(children))} allocated / {fmtG(Number(item.weight_grams) || 0)} purchased
            {remainingWeight(item, children) > 0.0005 && <> · {fmtG(remainingWeight(item, children))} remaining</>}
          </p>
          <ul className="mt-1 space-y-0.5">
            {children.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-[11px]">
                <Link href={`/admin/holdings/${c.id}`} className="font-mono text-gold-tint hover:text-gold-bright">
                  {c.stock_number}
                </Link>
                <span className="truncate text-warmgrey">{c.description}</span>
                <span className="whitespace-nowrap text-white">{fmtG(Number(c.weight_grams) || 0)}</span>
                <span className={'whitespace-nowrap text-[9px] uppercase tracking-luxe ' + (c.status === 'sold' ? 'text-emerald-300' : 'text-warmgrey')}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {/* Purchase agreement */}
      <Block heading="Purchase agreement">
        {request ? (
          <>
            <p className="text-[12px]">
              <Link href={`/admin/valuation-requests?open=${request.id}`} className="font-mono text-gold-tint hover:text-gold-bright">
                {ref}
              </Link>
              <span className="ml-2 text-[10px] uppercase tracking-luxe text-warmgrey">{request.status}</span>
            </p>
            <Row label="Paid" value={request.payment_amount != null ? formatGBP(Number(request.payment_amount)) : '—'} />
            <Row
              label="Method"
              value={request.payment_method ? PAYMENT_METHOD_LABELS[request.payment_method as PaymentMethod] : '—'}
            />
            {request.payment_reference && <Row label="Reference" value={request.payment_reference} />}
            {request.payment_method === 'bank_transfer' && (request.payment_sort_code || request.payment_account_number) && (
              <Row
                label="Paid to"
                value={[
                  request.payment_sort_code,
                  request.payment_account_number ? `····${request.payment_account_number.slice(-4)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            )}
            {request.paid_at && <Row label="Paid on" value={new Date(request.paid_at).toLocaleString('en-GB')} />}
            <Row label="Submitted" value={new Date(request.created_at).toLocaleDateString('en-GB')} />
            <p className="pt-1">
              <Link
                href={`/admin/valuation-requests/${request.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-luxe text-gold-metallic/70 hover:text-gold-bright"
              >
                Open purchase document
              </Link>
            </p>
          </>
        ) : (
          <p className="text-[12px] text-warmgrey">Added manually - no purchase agreement linked.</p>
        )}
      </Block>

      {/* Seller */}
      <Block heading="Original seller">
        {customer ? (
          <>
            <Link href={`/admin/customers/${customer.id}`} className="text-[13px] text-gold-tint hover:text-gold-bright">
              {customer.first_name} {customer.last_name}
            </Link>
            <p className="text-[11px] text-warmgrey">
              {[customer.email, customer.phone].filter(Boolean).join(' · ')}
            </p>
            {(customer.address_line1 || customer.postcode) && (
              <p className="text-[11px] text-warmgrey">
                {[customer.address_line1, customer.address_line2, customer.city, customer.postcode].filter(Boolean).join(', ')}
              </p>
            )}
          </>
        ) : request ? (
          <p className="text-[12px] text-warmgrey">
            {request.first_name} {request.last_name} · {request.email}
            <span className="block text-[10px] text-warmgrey/60">No customer profile linked yet.</span>
          </p>
        ) : (
          <p className="text-[12px] text-warmgrey/70">No customer record linked.</p>
        )}
      </Block>

      {/* Sale */}
      {sale && (
        <Block heading={sale.voided_at ? 'Sold (invoice voided)' : 'Sold'}>
          <p className="text-[12px]">
            <Link href={`/admin/sales/${sale.id}`} className="font-mono text-gold-tint hover:text-gold-bright">
              {sale.invoice_number}
            </Link>
            <span className="ml-2 text-[11px] text-warmgrey">{new Date(sale.sold_at).toLocaleDateString('en-GB')}</span>
          </p>
          {sale.buyer && (
            <p className="text-[11px] text-warmgrey">
              to{' '}
              <Link href={`/admin/buyers/${sale.buyer.id}`} className="text-white hover:text-gold-bright">
                {sale.buyer.name}
              </Link>
            </p>
          )}
        </Block>
      )}
    </Panel>
  );
}

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gold-metallic/10 pt-2 first:border-t-0 first:pt-0">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-luxe text-gold-metallic/70">{heading}</div>
      <div className="space-y-1">{children}</div>
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
  const isPiece = !!item.parent_stock_item_id;

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value as (typeof form)[K] }));

  const updateCarat = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const carat = e.target.value;
    const purity = purityToPercent(carat);
    setForm((prev) => ({
      ...prev,
      carat,
      purity_percentage: purity != null ? purity.toString() : carat ? prev.purity_percentage : '',
    }));
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (form.metal_type && !(Number(form.purity_percentage) > 0)) {
      setFeedback({ ok: false, text: 'A metal item needs a purity % - pick a carat above to fill it automatically.' });
      return;
    }
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
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Item details</h2>
      {disabled && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          This item is sold. Void the sale below to edit the underlying details again.
        </p>
      )}
      {isPiece && !disabled && (
        <p className="text-[11px] text-warmgrey">
          Metal and carat come from the bulk purchase. Weight is checked against what the bulk
          holding has left.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Select label="Metal" value={form.metal_type} onChange={update('metal_type')} disabled={disabled || isPiece}>
          {METAL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m || '(none)'}</option>
          ))}
        </Select>
        <Select label="Carat / purity" value={form.carat} onChange={updateCarat} disabled={disabled || isPiece}>
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
        </Select>
        <NumberField label="Purity %" value={form.purity_percentage} onChange={update('purity_percentage')} step="0.01" disabled={disabled || isPiece} />
        <NumberField label="Weight (g)" value={form.weight_grams} onChange={update('weight_grams')} step="0.001" disabled={disabled} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField label="Item type" value={form.item_type} onChange={update('item_type')} disabled={disabled} />
        <TextField label="Description" value={form.description} onChange={update('description')} disabled={disabled} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NumberField label="Paid (£)" value={form.acquired_paid_gbp} onChange={update('acquired_paid_gbp')} step="0.01" disabled={disabled} />
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">Acquired at</span>
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
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">Notes</span>
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
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>{feedback.text}</p>
        )}
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- Sale */

function SaleSummary({ item, trace, onChanged }: { item: StockItem; trace: HoldingTrace; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const cost = Number(item.acquired_paid_gbp) || 0;
  const sold = Number(item.sold_amount_gbp) || 0;
  const pl = sold - cost;
  const plPct = cost > 0 ? (pl / cost) * 100 : 0;
  const sale = trace.sale;

  const revert = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = sale ? await voidSale(sale.id) : await unmarkStockItemSale(item.id);
      if (result.ok) onChanged();
      else {
        setFeedback(result.error);
        setArmed(false);
      }
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-gold-metallic/15 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Sale</h2>
        {sale && (
          <Link
            href={`/admin/sales/${sale.id}/invoice`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 hover:text-gold-bright"
          >
            View invoice
          </Link>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Row
          label="Buyer"
          value={sale?.buyer?.name ?? item.sold_to_name ?? '—'}
          href={sale?.buyer ? `/admin/buyers/${sale.buyer.id}` : undefined}
        />
        <Row label="Invoice" value={sale?.invoice_number ?? 'Legacy sale (no invoice)'} href={sale ? `/admin/sales/${sale.id}` : undefined} />
        <Row label="Sold at" value={item.sold_at ? new Date(item.sold_at).toLocaleString('en-GB') : '—'} />
        <Row label="Spot at sale" value={item.sold_spot_gbp_per_g ? `${formatGBP(Number(item.sold_spot_gbp_per_g), false, 4)}/g` : '—'} />
        <Row label="Sale amount" value={formatGBP(sold)} emphasis />
        <Row label="Realised P&L" value={`${formatGBP(pl, true)} (${formatPct(plPct)})`} tone={pl >= 0 ? 'positive' : 'negative'} />
      </div>
      <div className="flex items-center justify-end gap-3 pt-1">
        {feedback && <p className="text-[11px] text-amber-400">{feedback}</p>}
        {armed ? (
          <>
            <button type="button" onClick={revert} disabled={pending} className="rounded border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20">
              {pending ? 'Reverting…' : sale ? 'Confirm void invoice' : 'Confirm unmark'}
            </button>
            <button type="button" onClick={() => setArmed(false)} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setArmed(true)} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright">
            {sale ? 'Void sale' : 'Unmark sale'}
          </button>
        )}
      </div>
      {sale && (
        <p className="text-[10px] text-warmgrey/60">
          Voiding returns every item on {sale.invoice_number} to holdings, not just this one.
        </p>
      )}
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
      <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-red-300">Danger zone</h3>
      <p className="mt-2 text-[11px] text-warmgrey">
        Moves the stock row to the trash. The purchase agreement and customer it links to are kept.
      </p>
      <div className="mt-2 flex items-center gap-2">
        {armed ? (
          <>
            <button type="button" onClick={remove} disabled={pending} className="rounded border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20">
              {pending ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button type="button" onClick={() => setArmed(false)} disabled={pending} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright">
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setArmed(true)} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300">
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
      <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{title}</h3>
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
  href,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  hint?: string;
  tone?: 'positive' | 'negative';
  href?: string;
}) {
  const cls =
    'text-[13px] ' +
    (tone === 'negative' ? 'text-red-300' : tone === 'positive' ? 'text-emerald-300' : emphasis ? 'text-gold-bright' : 'text-white');
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-luxe text-warmgrey/70">{label}</span>
      <span className="text-right">
        {href ? (
          <Link href={href} className={cls + ' hover:text-gold-bright'}>{value}</Link>
        ) : (
          <span className={cls}>{value}</span>
        )}
        {hint && <div className="text-[10px] text-warmgrey/70">{hint}</div>}
      </span>
    </div>
  );
}

function TextField({ label, value, onChange, disabled, type = 'text' }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
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

function NumberField({ label, value, onChange, step, disabled, required }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; step?: string; disabled?: boolean; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
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

function Select({ label, value, onChange, children, disabled }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
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

function computeSpotValue(item: StockItem, spotPerGram: number | null): number | null {
  if (!spotPerGram) return null;
  const weight = Number(item.weight_grams) || 0;
  const purity = Number(item.purity_percentage) || 0;
  if (weight <= 0 || purity <= 0) return null;
  return weight * (purity / 100) * spotPerGram;
}

function pctBelowSpot(paid: number, spotValue: number): string {
  if (spotValue <= 0) return '—';
  return `${(((spotValue - paid) / spotValue) * 100).toFixed(1)}%`;
}

function fmtG(n: number): string {
  return `${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}g`;
}

function formatGBP(n: number, withSign = false, decimals = 2): string {
  const sign = withSign && n > 0 ? '+' : '';
  return `${sign}£${n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
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

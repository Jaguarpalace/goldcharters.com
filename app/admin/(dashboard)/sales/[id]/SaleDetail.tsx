'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { SaleDetail as SaleDetailData } from '@/lib/queries/sales';
import { formatBuyerAddress } from '@/lib/format';
import { updateSaleNotes, voidSale } from '@/lib/actions/sales';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SaleDetail({ sale }: { sale: SaleDetailData }) {
  const router = useRouter();
  const [notes, setNotes] = useState(sale.notes ?? '');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState(false);
  const snap = sale.buyer_snapshot ?? sale.buyer ?? null;
  const voided = !!sale.voided_at;

  const saveNotes = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateSaleNotes(sale.id, notes);
      if (result.ok) {
        setFeedback({ ok: true, text: 'Saved.' });
        setTimeout(() => setFeedback(null), 2000);
      } else setFeedback({ ok: false, text: result.error });
    });
  };

  const doVoid = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await voidSale(sale.id);
      if (result.ok) router.refresh();
      else {
        setFeedback({ ok: false, text: result.error });
        setArmed(false);
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-5">
        {/* ------------------------------------------------ Items */}
        <section className="rounded-lg border border-gold-metallic/15 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
              Items on this invoice
            </h2>
            <Link
              href={`/admin/sales/${sale.id}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright"
            >
              Generate invoice
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-[10px] uppercase tracking-luxe text-warmgrey">
                <tr>
                  <th className="py-1.5 text-left">Stock #</th>
                  <th className="py-1.5 text-left">Description</th>
                  <th className="py-1.5 text-left">Metal / carat</th>
                  <th className="py-1.5 text-right">Weight</th>
                  <th className="py-1.5 text-right">Qty</th>
                  <th className="py-1.5 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-metallic/10">
                {sale.items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">
                      <Link
                        href={`/admin/holdings/${i.stock_item_id}`}
                        className="font-mono text-[12px] font-medium text-white hover:text-gold-bright"
                      >
                        {i.stock_number}
                      </Link>
                    </td>
                    <td className="py-2 text-[12px] text-white">{i.description}</td>
                    <td className="py-2 text-[12px] text-warmgrey">
                      {[i.metal_type, i.carat].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="py-2 text-right text-[12px] text-white">
                      {i.weight_grams != null ? `${Number(i.weight_grams).toFixed(2)}g` : '—'}
                    </td>
                    <td className="py-2 text-right text-[12px] text-white">{i.quantity}</td>
                    <td className="py-2 text-right text-[12px] text-white">{gbp(Number(i.line_total_gbp))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-[12px]">
                <tr>
                  <td colSpan={5} className="pt-3 text-right text-warmgrey">Subtotal</td>
                  <td className="pt-3 text-right text-white">{gbp(Number(sale.subtotal_gbp))}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right text-warmgrey">VAT {Number(sale.vat_rate)}%</td>
                  <td className="text-right text-white">{gbp(Number(sale.vat_gbp))}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="pt-1 text-right font-semibold text-gold-tint">Total</td>
                  <td className="pt-1 text-right font-semibold text-gold-bright">{gbp(Number(sale.total_gbp))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------ Notes */}
        <section className="space-y-3 rounded-lg border border-gold-metallic/15 p-5">
          <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Notes on the invoice
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            disabled={voided}
            className="w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white disabled:opacity-60 focus:border-gold-metallic focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={saveNotes}
              disabled={pending || voided}
              className="rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:bg-gold-metallic/15 disabled:opacity-50"
            >
              Save notes
            </button>
            {feedback && (
              <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
                {feedback.text}
              </p>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="space-y-2 rounded-lg border border-gold-metallic/15 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Sold to
          </h3>
          {snap ? (
            <div className="text-[12px] text-warmgrey">
              <div className="text-[13px] font-medium text-white">
                {sale.buyer ? (
                  <Link href={`/admin/buyers/${sale.buyer.id}`} className="hover:text-gold-bright">
                    {snap.name}
                  </Link>
                ) : (
                  snap.name
                )}
              </div>
              {snap.contact_name && <div>{snap.contact_name}</div>}
              {formatBuyerAddress(snap) && <div>{formatBuyerAddress(snap)}</div>}
              {snap.phone && <div>{snap.phone}</div>}
              {snap.email && <div>{snap.email}</div>}
              {snap.company_number && <div>Company no. {snap.company_number}</div>}
              {snap.vat_number && <div>VAT no. {snap.vat_number}</div>}
              <p className="mt-2 text-[10px] text-warmgrey/60">
                As recorded when the invoice was issued.
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-warmgrey">Buyer details missing.</p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-gold-metallic/15 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Invoice
          </h3>
          <Row label="Number" value={sale.invoice_number} />
          <Row label="Date" value={new Date(sale.sold_at).toLocaleDateString('en-GB')} />
          <Row label="Items" value={String(sale.items.length)} />
          <Row label="VAT" value={`${Number(sale.vat_rate)}% - ${gbp(Number(sale.vat_gbp))}`} />
          <Row label="Total due" value={gbp(Number(sale.total_gbp))} emphasis />
          {sale.voided_at && (
            <Row label="Voided" value={new Date(sale.voided_at).toLocaleString('en-GB')} />
          )}
        </div>

        {!voided && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-red-300">
              Void this sale
            </h3>
            <p className="mt-2 text-[11px] text-warmgrey">
              Returns every item on it to holdings. The invoice number is kept on record and
              never reused.
            </p>
            <div className="mt-2 flex items-center gap-2">
              {armed ? (
                <>
                  <button
                    type="button"
                    onClick={doVoid}
                    disabled={pending}
                    className="rounded border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20"
                  >
                    {pending ? 'Voiding…' : 'Confirm void'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setArmed(false)}
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
                  Void sale
                </button>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-luxe text-warmgrey/70">{label}</span>
      <span className={'text-right text-[13px] ' + (emphasis ? 'text-gold-bright' : 'text-white')}>{value}</span>
    </div>
  );
}

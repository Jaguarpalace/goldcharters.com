'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { Buyer, Sale } from '@/types/database';
import { deleteBuyer, upsertBuyer } from '@/lib/actions/buyers';
import { BuyerFields, buyerToDraft, draftToInput, type BuyerDraft } from '../BuyerForm';

const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function BuyerDetail({ buyer, sales }: { buyer: Buyer; sales: Sale[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BuyerDraft>(buyerToDraft(buyer));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [armed, setArmed] = useState(false);

  const active = sales.filter((s) => !s.voided_at);
  const lifetime = active.reduce((sum, s) => sum + (Number(s.total_gbp) || 0), 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertBuyer(draftToInput(draft, buyer.id));
      if (result.ok) {
        setFeedback({ ok: true, text: 'Saved.' });
        setTimeout(() => setFeedback(null), 2000);
        router.refresh();
      } else setFeedback({ ok: false, text: result.error });
    });
  };

  const remove = () => {
    startTransition(async () => {
      const result = await deleteBuyer(buyer.id);
      if (result.ok) {
        router.push('/admin/buyers');
        router.refresh();
      } else {
        setFeedback({ ok: false, text: result.error });
        setArmed(false);
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
      <form onSubmit={save} className="space-y-4 rounded-lg border border-gold-metallic/15 p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Buyer details
        </h2>
        <p className="text-[11px] text-warmgrey">
          Changes apply to future invoices. Invoices already issued keep the details as printed.
        </p>
        <BuyerFields draft={draft} onChange={setDraft} />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !draft.name.trim()}
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

      <aside className="space-y-4">
        <div className="space-y-2 rounded-lg border border-gold-metallic/15 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Summary
          </h3>
          <Row label="Invoices" value={String(active.length)} />
          <Row label="Lifetime sales" value={gbp(lifetime)} emphasis />
          <Row label="Buyer since" value={new Date(buyer.created_at).toLocaleDateString('en-GB')} />
        </div>

        <div className="space-y-2 rounded-lg border border-gold-metallic/15 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Invoices
          </h3>
          {sales.length === 0 ? (
            <p className="text-[12px] text-warmgrey">No sales to this buyer yet.</p>
          ) : (
            <ul className="divide-y divide-gold-metallic/10">
              {sales.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <Link
                      href={`/admin/sales/${s.id}`}
                      className="font-mono text-[12px] font-medium text-white hover:text-gold-bright"
                    >
                      {s.invoice_number}
                    </Link>
                    <div className="text-[10px] text-warmgrey">
                      {new Date(s.sold_at).toLocaleDateString('en-GB')}
                      {s.voided_at && <span className="ml-2 text-red-300">voided</span>}
                    </div>
                  </div>
                  <span className={'text-[12px] ' + (s.voided_at ? 'text-warmgrey line-through' : 'text-white')}>
                    {gbp(Number(s.total_gbp) || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-red-300">
            Danger zone
          </h3>
          <p className="mt-2 text-[11px] text-warmgrey">
            Removes the buyer from the pick list. Invoices already issued keep their copy of the
            details.
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
                  {pending ? 'Removing…' : 'Confirm remove'}
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
                Remove buyer
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-luxe text-warmgrey/70">{label}</span>
      <span className={'text-[13px] ' + (emphasis ? 'text-gold-bright' : 'text-white')}>{value}</span>
    </div>
  );
}

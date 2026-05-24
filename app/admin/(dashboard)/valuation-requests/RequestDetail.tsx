'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type ValuationRequest,
  type ValuationRequestImage,
  type ValuationRequestStatus,
} from '@/types/database';
import {
  updateValuationNotes,
  updateValuationPayment,
  type PaymentInput,
} from '@/lib/actions/valuationRequests';
import { StatusPipeline } from './StatusPipeline';

type Row = ValuationRequest & { valuation_request_images?: ValuationRequestImage[] };

/** Expanded inline detail view shown when a row is opened. */
export function RequestDetail({
  request,
  onPatch,
}: {
  request: Row;
  /** Called whenever this row's data changes, so the parent can keep its
   * client-side cache in sync (used by search filters + CSV export). */
  onPatch: (patch: Partial<ValuationRequest>) => void;
}) {
  const photos = request.valuation_request_images ?? [];
  const paymentRelevant =
    request.status === 'bought' ||
    request.status === 'completed' ||
    request.payment_amount !== null;

  return (
    <div className="grid gap-5 border-t border-gold-metallic/15 bg-ink-950/60 p-5 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-5">
        <StatusPipeline
          requestId={request.id}
          currentStatus={request.status as ValuationRequestStatus}
          onChange={(status) => onPatch({ status })}
        />

        {/* Submission details — dense grid, no card padding */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Submission
          </h3>
          <dl className="mt-2 grid gap-x-5 gap-y-2 text-sm sm:grid-cols-3">
            <Field label="Branch" value={request.form_variant ?? '—'} />
            <Field label="Item type" value={request.item_type.replace(/_/g, ' ')} />
            <Field label="Contact via" value={request.preferred_contact_method} />
            {request.metal_type && <Field label="Metal" value={request.metal_type} />}
            {request.item_category && <Field label="Form" value={request.item_category} />}
            {request.jewellery_type && <Field label="Type" value={request.jewellery_type} />}
            {request.gemstone && <Field label="Gemstone" value={request.gemstone} />}
            {request.brand && <Field label="Brand" value={request.brand} />}
            {request.model && <Field label="Model" value={request.model} />}
            {request.condition && <Field label="Condition" value={request.condition} />}
            {request.box_papers && <Field label="Box / papers" value={request.box_papers} />}
            {request.carat && <Field label="Carat" value={request.carat} />}
            {request.weight_grams !== null && (
              <Field label="Weight" value={`${request.weight_grams} g`} />
            )}
            {request.estimated_value !== null && (
              <Field label="Customer estimate" value={`£${request.estimated_value}`} />
            )}
          </dl>

          {request.description && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
                Customer notes
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-warmgrey">
                {request.description}
              </p>
            </div>
          )}

          <p className="mt-3 text-[10px] text-warmgrey">
            <Link href={`mailto:${request.email}`} className="text-gold-tint hover:text-gold-bright">
              {request.email}
            </Link>
            <span className="text-warmgrey/50"> · </span>
            <Link href={`tel:${request.phone}`} className="text-gold-tint hover:text-gold-bright">
              {request.phone}
            </Link>
          </p>
        </div>

        {photos.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
              Photos ({photos.length})
            </h3>
            <ul className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
              {photos.map((p) => (
                <li key={p.id}>
                  <a href={p.image_url} target="_blank" rel="noreferrer noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image_url}
                      alt={p.file_name ?? 'Uploaded photo'}
                      className="aspect-square w-full rounded border border-gold-metallic/20 object-cover transition hover:border-gold-metallic"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <NotesEditor
          requestId={request.id}
          initial={request.notes ?? ''}
          onSaved={(notes) => onPatch({ notes: notes || null })}
        />
        {paymentRelevant && (
          <PaymentEditor
            requestId={request.id}
            initial={{
              amount: request.payment_amount,
              method: request.payment_method,
              reference: request.payment_reference,
              paidAt: request.paid_at,
            }}
            onSaved={(p) =>
              onPatch({
                payment_amount: p.amount,
                payment_method: p.method,
                payment_reference: p.reference,
                paid_at: p.paidAt,
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-luxe text-warmgrey/70">{label}</dt>
      <dd className="text-sm text-white">{value ?? '—'}</dd>
    </div>
  );
}

/* ------------------------------- Notes ----------------------------------- */

function NotesEditor({
  requestId,
  initial,
  onSaved,
}: {
  requestId: string;
  initial: string;
  onSaved: (notes: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const dirty = value !== initial;

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateValuationNotes(requestId, value);
      if (result.ok) {
        onSaved(value);
        setFeedback('Saved');
        setTimeout(() => setFeedback(null), 1500);
      } else {
        setFeedback(result.error);
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Internal notes
        </h3>
        <span className="text-[9px] uppercase tracking-luxe text-warmgrey/60">
          Admin only
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        placeholder="Add a note for the team — not visible to the customer."
        className="mt-2 w-full rounded-md border border-gold-metallic/20 bg-ink-900/70 px-3 py-2 text-sm text-white placeholder:text-warmgrey/40 focus:border-gold-metallic focus:outline-none focus:ring-1 focus:ring-gold-metallic/40"
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {feedback && (
          <span className="text-[11px] text-gold-tint">{feedback}</span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="rounded-md border border-gold-metallic/40 bg-ink-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-ink-800 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Payment ---------------------------------- */

function PaymentEditor({
  requestId,
  initial,
  onSaved,
}: {
  requestId: string;
  initial: PaymentInput;
  onSaved: (payment: PaymentInput) => void;
}) {
  const [amount, setAmount] = useState(
    initial.amount !== null ? String(initial.amount) : '',
  );
  const [method, setMethod] = useState<PaymentMethod | ''>(initial.method ?? '');
  const [reference, setReference] = useState(initial.reference ?? '');
  const [paidAt, setPaidAt] = useState(toLocalDate(initial.paidAt));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty =
    amount !== (initial.amount !== null ? String(initial.amount) : '') ||
    (method || '') !== (initial.method ?? '') ||
    reference !== (initial.reference ?? '') ||
    paidAt !== toLocalDate(initial.paidAt);

  const save = () => {
    setFeedback(null);
    const parsedAmount = amount.trim() === '' ? null : Number(amount);
    if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      setFeedback({ ok: false, text: 'Amount must be a positive number.' });
      return;
    }
    const payload: PaymentInput = {
      amount: parsedAmount,
      method: method || null,
      reference: reference.trim() || null,
      paidAt: paidAt ? new Date(paidAt).toISOString() : null,
    };
    startTransition(async () => {
      const result = await updateValuationPayment(requestId, payload);
      if (result.ok) {
        onSaved(payload);
        setFeedback({ ok: true, text: 'Saved' });
        setTimeout(() => setFeedback(null), 1500);
      } else {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <div className="rounded-lg border border-gold-metallic/25 bg-gradient-to-br from-gold-metallic/[0.06] to-transparent p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Payment
        </h3>
        <span className="text-[9px] uppercase tracking-luxe text-warmgrey/60">
          Final settlement
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[9px] uppercase tracking-luxe text-warmgrey/70">Amount (£)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-900/70 px-2.5 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-luxe text-warmgrey/70">Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod | '')}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-900/70 px-2.5 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
          >
            <option value="">—</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-luxe text-warmgrey/70">Reference</span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Bank ref / cheque no."
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-900/70 px-2.5 py-1.5 text-sm text-white placeholder:text-warmgrey/40 focus:border-gold-metallic focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-[9px] uppercase tracking-luxe text-warmgrey/70">Paid on</span>
          <input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-900/70 px-2.5 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {feedback && (
          <span className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="rounded-md border border-gold-metallic/40 bg-ink-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-ink-800 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Saving…' : 'Save payment'}
        </button>
      </div>
    </div>
  );
}

function toLocalDate(iso: string | null): string {
  if (!iso) return '';
  // Convert an ISO timestamp into a `YYYY-MM-DD` string the <input type="date">
  // accepts, using local time so the picker reflects the admin's wall clock.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createWalkInPurchase } from '@/lib/actions/valuationRequests';
import {
  METAL_OPTIONS,
  caratForHoldingsFromLine,
  normaliseMetalForHoldings,
} from '@/lib/schemas/valuationFormOptions';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/database';

/** Per-line metal choices. "Other" covers watches, handbags and anything
 * else that can't be priced at spot - those lines are exempt from the
 * mandatory carat/purity rule. */
const LINE_METAL_OPTIONS = ['Gold', 'Silver', 'Platinum', 'Palladium', 'Other'] as const;

type ItemLine = {
  description: string;
  metal_type: string;
  carat: string;
  weight_grams: string;
  hallmark: string;
  price_gbp: string;
};

const EMPTY_LINE: ItemLine = {
  description: '',
  metal_type: 'Gold',
  carat: '',
  weight_grams: '',
  hallmark: '',
  price_gbp: '',
};

const lineTotal = (lines: ItemLine[]) =>
  lines.reduce((sum, l) => sum + (Number(l.price_gbp) || 0), 0);

export function WalkInForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    payment_method: 'cash' as PaymentMethod,
    payment_reference: '',
    payment_sort_code: '',
    payment_account_number: '',
  });
  // Every purchase is itemised - one line per piece, starting with one
  // open line. The request's headline fields (metal, weight, description)
  // are derived from the lines on save, so there is no separate single-item
  // section to fill in twice.
  const [lines, setLines] = useState<ItemLine[]>([{ ...EMPTY_LINE }]);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  // The purchase's id (and therefore its reference) is generated the moment
  // the form opens, so the reference can be shown - and read out to the
  // customer - BEFORE saving. The same id becomes the database row on save,
  // so screen, printed document and payment reference always agree.
  // Generated in an effect (not at render) to keep server/client HTML equal.
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  useEffect(() => {
    setPurchaseId(crypto.randomUUID());
  }, []);
  const reference = purchaseId ? purchaseId.slice(0, 8).toUpperCase() : null;

  const patchLine = (idx: number, patch: Partial<ItemLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const total = lineTotal(lines);

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value as (typeof form)[K] }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    // Purity is mandatory for metal pieces - a holding without it can never
    // be priced at spot. A carat typed in the description ("24ct") counts.
    for (const [i, l] of lines.entries()) {
      if (
        normaliseMetalForHoldings(l.metal_type) &&
        !caratForHoldingsFromLine(l.metal_type, l.carat, l.description)
      ) {
        setFeedback(
          `Item ${i + 1} needs a carat/purity the ledger can price (e.g. 9ct, 22ct, 925 silver).`,
        );
        return;
      }
    }
    // The record's headline fields are built from the lines: metal from the
    // first line when it's one the request schema knows, total weight, and a
    // joined description.
    const firstLineMetal = METAL_OPTIONS.find(
      (m) => m.toLowerCase() === (lines[0]?.metal_type ?? '').trim().toLowerCase(),
    );
    const totalWeight = lines.reduce((sum, l) => sum + (Number(l.weight_grams) || 0), 0);
    startTransition(async () => {
      const result = await createWalkInPurchase({
        id: purchaseId ?? undefined,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        postcode: form.postcode || null,
        metal_type: firstLineMetal ?? 'Gold',
        carat: lines[0]?.carat || null,
        weight_grams: totalWeight > 0 ? totalWeight : null,
        description:
          lines.map((l) => l.description.trim()).filter(Boolean).join(', ').slice(0, 2000) ||
          null,
        condition: null,
        payment_amount_gbp: total,
        payment_method: form.payment_method,
        payment_reference: form.payment_reference || null,
        payment_sort_code:
          form.payment_method === 'bank_transfer' ? form.payment_sort_code || null : null,
        payment_account_number:
          form.payment_method === 'bank_transfer' ? form.payment_account_number || null : null,
        items: lines.map((l) => ({
          description: l.description,
          metal_type: l.metal_type || null,
          carat: l.carat || null,
          weight_grams: l.weight_grams ? Number(l.weight_grams) : null,
          hallmark: l.hallmark || null,
          price_gbp: Number(l.price_gbp || 0),
        })),
      });
      if (result.ok) {
        // Send the admin straight to the printable document. They sign it,
        // hand the customer their copy, done.
        router.push(
          `/admin/valuation-requests/${result.data.valuation_request_id}/print`,
        );
      } else {
        setFeedback(result.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* ---------------------------------------------- Seller */}
      <Section title="Seller">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="First name" required value={form.first_name} onChange={update('first_name')} />
          <Field label="Last name" required value={form.last_name} onChange={update('last_name')} />
          <Field label="Email" required type="email" value={form.email} onChange={update('email')} />
          <Field label="Phone" required value={form.phone} onChange={update('phone')} />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Address line 1" value={form.address_line1} onChange={update('address_line1')} />
          <Field label="Address line 2" value={form.address_line2} onChange={update('address_line2')} />
          <Field label="City" value={form.city} onChange={update('city')} />
          <Field label="Postcode" value={form.postcode} onChange={update('postcode')} />
        </div>
      </Section>

      {/* ---------------------------------------------- Items */}
      <Section title="Items">
        <p className="text-[11px] text-warmgrey">
          One line per piece. Each line prints on the purchase document and becomes its own
          entry in the holdings ledger. Pick metal &quot;Other&quot; for watches, handbags and
          anything else without a purity.
        </p>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gold-metallic/15 bg-ink-950/50 p-3"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Field
                label={`Item ${idx + 1} description`}
                required
                value={line.description}
                onChange={(e) => patchLine(idx, { description: e.target.value })}
                placeholder="e.g. 9ct gold curb chain"
              />
              <SelectField
                label="Metal"
                required
                value={line.metal_type}
                onChange={(e) => patchLine(idx, { metal_type: e.target.value })}
              >
                {LINE_METAL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m === 'Other' ? 'Other / not metal' : m}
                  </option>
                ))}
              </SelectField>
              <Field
                label="Carat / purity"
                required={Boolean(normaliseMetalForHoldings(line.metal_type))}
                value={line.carat}
                onChange={(e) => patchLine(idx, { carat: e.target.value })}
                placeholder="9ct"
              />
              <NumField
                label="Weight (g)"
                value={line.weight_grams}
                onChange={(e) => patchLine(idx, { weight_grams: e.target.value })}
                step="0.001"
              />
              <Field
                label="Hallmark / serial no."
                value={line.hallmark}
                onChange={(e) => patchLine(idx, { hallmark: e.target.value })}
                placeholder="e.g. 375 Birmingham"
              />
              <NumField
                label="Price (£)"
                required
                value={line.price_gbp}
                onChange={(e) => patchLine(idx, { price_gbp: e.target.value })}
                step="0.01"
              />
            </div>
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                className="mt-2 text-[11px] text-warmgrey hover:text-red-300"
              >
                Remove item
              </button>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
            className="rounded-md border border-gold-metallic/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint hover:border-gold-metallic hover:text-gold-bright"
          >
            + Add item line
          </button>
          <span className="text-xs text-warmgrey">
            {lines.length} item{lines.length === 1 ? '' : 's'} · total{' '}
            <strong className="text-gold-bright">
              £{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </strong>
          </span>
        </div>
      </Section>

      {/* ---------------------------------------------- Payment */}
      <Section title="Payment">
        {reference && (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
              Agreement reference
            </span>
            <span className="font-mono text-[16px] font-bold tracking-widest text-gold-bright">
              {reference}
            </span>
            <span className="text-[10px] text-warmgrey/60">
              shown on the printed document and used as the payment reference
            </span>
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
              Amount paid (£)
            </span>
            <div className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/40 px-3 py-2 text-sm text-gold-bright">
              £{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </div>
            <span className="mt-1 block text-[10px] text-warmgrey/70">
              Set automatically from the item lines above.
            </span>
          </label>
          <SelectField
            label="Method"
            required
            value={form.payment_method}
            onChange={update('payment_method')}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </SelectField>
          <Field
            label="Reference (optional)"
            value={form.payment_reference}
            onChange={update('payment_reference')}
            placeholder="Leave blank to use the purchase reference"
          />
        </div>
        {form.payment_method === 'bank_transfer' && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field
              label="Seller sort code"
              value={form.payment_sort_code}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  payment_sort_code: e.target.value
                    .replace(/\D/g, '')
                    .slice(0, 6)
                    .replace(/(\d{2})(?=\d)/g, '$1-'),
                }))
              }
              placeholder="20-67-90"
            />
            <Field
              label="Seller account number"
              value={form.payment_account_number}
              onChange={update('payment_account_number')}
              placeholder="12345678"
            />
          </div>
        )}
      </Section>

      {/* ---------------------------------------------- Submit */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {feedback ? (
          <p className="text-[11px] text-amber-400">{feedback}</p>
        ) : (
          <p className="text-[11px] text-warmgrey">
            On save: creates the customer record, marks the purchase Bought and adds each line
            to the holdings ledger, then opens the printable purchase document.
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save & print purchase document'}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
        {!required && <span className="ml-1 text-warmgrey/50">(optional)</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

function NumField({
  label,
  required,
  value,
  onChange,
  step,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: string;
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
        required={required}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

function SelectField({
  label,
  required,
  value,
  onChange,
  children,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
        {!required && <span className="ml-1 text-warmgrey/50">(optional)</span>}
      </span>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createWalkInPurchase } from '@/lib/actions/valuationRequests';
import {
  GOLD_PURITY,
  METAL_OPTIONS,
  PLATINUM_PURITY,
  SILVER_PURITY,
  CONDITION_OPTIONS,
  type PurityOption,
} from '@/lib/schemas/valuationFormOptions';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types/database';

function purityFor(metal: string): readonly PurityOption[] {
  if (metal === 'Silver') return SILVER_PURITY;
  if (metal === 'Platinum') return PLATINUM_PURITY;
  return GOLD_PURITY;
}

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
  metal_type: '',
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
    metal_type: 'Gold',
    carat: '',
    weight_grams: '',
    description: '',
    condition: '',
    payment_amount_gbp: '',
    payment_method: 'cash' as PaymentMethod,
    payment_reference: '',
    payment_sort_code: '',
    payment_account_number: '',
  });
  const [lines, setLines] = useState<ItemLine[]>([]);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const patchLine = (idx: number, patch: Partial<ItemLine>) =>
    setLines((prev) => {
      const next = prev.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      return next;
    });

  // Whenever lines exist, the amount paid is their sum - the agreement's
  // itemised total and the payment can never disagree.
  const itemised = lines.length > 0;
  const total = lineTotal(lines);

  const update =
    <K extends keyof typeof form>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value as (typeof form)[K] }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await createWalkInPurchase({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        postcode: form.postcode || null,
        metal_type: form.metal_type,
        carat: form.carat || null,
        weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
        description: form.description || null,
        condition: form.condition || null,
        payment_amount_gbp: itemised ? total : Number(form.payment_amount_gbp || 0),
        payment_method: form.payment_method,
        payment_reference: form.payment_reference || null,
        payment_sort_code:
          form.payment_method === 'bank_transfer' ? form.payment_sort_code || null : null,
        payment_account_number:
          form.payment_method === 'bank_transfer' ? form.payment_account_number || null : null,
        items: itemised
          ? lines.map((l) => ({
              description: l.description,
              metal_type: l.metal_type || null,
              carat: l.carat || null,
              weight_grams: l.weight_grams ? Number(l.weight_grams) : null,
              hallmark: l.hallmark || null,
              price_gbp: Number(l.price_gbp || 0),
            }))
          : undefined,
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

  const purityOptions = purityFor(form.metal_type);

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

      {/* ---------------------------------------------- Item */}
      <Section title="Item">
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField label="Metal" required value={form.metal_type} onChange={update('metal_type')}>
            {METAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </SelectField>
          <SelectField label="Purity" value={form.carat} onChange={update('carat')}>
            {purityOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <NumField
            label="Weight (g)"
            value={form.weight_grams}
            onChange={update('weight_grams')}
            step="0.001"
          />
          <SelectField label="Condition" value={form.condition} onChange={update('condition')}>
            <option value="">(not noted)</option>
            {CONDITION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="mt-3">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={update('description')}
              rows={3}
              placeholder="Brief description of the piece (hallmarks, distinguishing features, condition notes, etc.)"
              className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
            />
          </label>
        </div>
      </Section>

      {/* ---------------------------------------------- Itemisation */}
      <Section title="Itemisation">
        <p className="text-[11px] text-warmgrey">
          Selling more than one piece? List each item so the printed purchase document shows them
          line by line. Each line becomes its own entry in the holdings ledger.
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
              <Field
                label="Metal"
                value={line.metal_type}
                onChange={(e) => patchLine(idx, { metal_type: e.target.value })}
                placeholder={form.metal_type}
              />
              <Field
                label="Carat / purity"
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
            <button
              type="button"
              onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
              className="mt-2 text-[11px] text-warmgrey hover:text-red-300"
            >
              Remove item
            </button>
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
          {itemised && (
            <span className="text-xs text-warmgrey">
              {lines.length} item{lines.length === 1 ? '' : 's'} · total{' '}
              <strong className="text-gold-bright">
                £{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </strong>
            </span>
          )}
        </div>
      </Section>

      {/* ---------------------------------------------- Payment */}
      <Section title="Payment">
        <div className="grid gap-3 md:grid-cols-3">
          {itemised ? (
            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
                Amount paid (£)
              </span>
              <div className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/40 px-3 py-2 text-sm text-gold-bright">
                £{total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </div>
              <span className="mt-1 block text-[10px] text-warmgrey/70">
                Set automatically from the itemised lines above.
              </span>
            </label>
          ) : (
          <NumField
            label="Amount paid (£)"
            required
            value={form.payment_amount_gbp}
            onChange={update('payment_amount_gbp')}
            step="0.01"
          />
          )}
          <SelectField
            label="Method"
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
              onChange={update('payment_sort_code')}
              placeholder="12-34-56"
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
            On save: creates the customer record, marks the purchase Bought and adds it to the
            holdings ledger, then opens the printable purchase document.
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

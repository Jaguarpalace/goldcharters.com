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
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

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
        payment_amount_gbp: Number(form.payment_amount_gbp || 0),
        payment_method: form.payment_method,
        payment_reference: form.payment_reference || null,
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

      {/* ---------------------------------------------- Payment */}
      <Section title="Payment">
        <div className="grid gap-3 md:grid-cols-3">
          <NumField
            label="Amount paid (£)"
            required
            value={form.payment_amount_gbp}
            onChange={update('payment_amount_gbp')}
            step="0.01"
          />
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
            placeholder="Bank transfer ref, cheque no., etc."
          />
        </div>
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

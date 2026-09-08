'use client';

import type { Buyer, BuyerKind } from '@/types/database';
import type { BuyerInput } from '@/lib/actions/buyers';

/** Controlled field set shared by the Buyers page and the inline "new buyer" step on a sale. */
export type BuyerDraft = {
  kind: BuyerKind;
  name: string;
  contact_name: string;
  company_number: string;
  vat_number: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postcode: string;
  country: string;
  notes: string;
};

export const EMPTY_BUYER: BuyerDraft = {
  kind: 'business',
  name: '',
  contact_name: '',
  company_number: '',
  vat_number: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  postcode: '',
  country: 'United Kingdom',
  notes: '',
};

export function buyerToDraft(b: Buyer): BuyerDraft {
  return {
    kind: b.kind,
    name: b.name,
    contact_name: b.contact_name ?? '',
    company_number: b.company_number ?? '',
    vat_number: b.vat_number ?? '',
    email: b.email ?? '',
    phone: b.phone ?? '',
    address_line1: b.address_line1 ?? '',
    address_line2: b.address_line2 ?? '',
    city: b.city ?? '',
    postcode: b.postcode ?? '',
    country: b.country ?? '',
    notes: b.notes ?? '',
  };
}

export function draftToInput(d: BuyerDraft, id?: string): BuyerInput {
  return {
    id,
    kind: d.kind,
    name: d.name,
    contact_name: d.contact_name || null,
    company_number: d.company_number || null,
    vat_number: d.vat_number || null,
    email: d.email || null,
    phone: d.phone || null,
    address_line1: d.address_line1 || null,
    address_line2: d.address_line2 || null,
    city: d.city || null,
    postcode: d.postcode || null,
    country: d.country || null,
    notes: d.notes || null,
  };
}

export function BuyerFields({
  draft,
  onChange,
  compact = false,
}: {
  draft: BuyerDraft;
  onChange: (next: BuyerDraft) => void;
  /** Hide notes and tighten the grid - for the sale modal. */
  compact?: boolean;
}) {
  const set =
    <K extends keyof BuyerDraft>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...draft, [key]: e.target.value });
  const business = draft.kind === 'business';

  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="radiogroup" aria-label="Buyer type">
        {(['business', 'individual'] as BuyerKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={draft.kind === k}
            onClick={() => onChange({ ...draft, kind: k })}
            className={
              'rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe transition ' +
              (draft.kind === k
                ? 'border-gold-metallic bg-gold-metallic/15 text-gold-bright'
                : 'border-gold-metallic/25 text-warmgrey hover:border-gold-metallic/60 hover:text-gold-tint')
            }
          >
            {k === 'business' ? 'Business' : 'Individual'}
          </button>
        ))}
      </div>

      <div className={'grid gap-3 ' + (compact ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
        <Field
          label={business ? 'Business name' : 'Full name'}
          required
          value={draft.name}
          onChange={set('name')}
          placeholder={business ? 'ABC Jewellery Ltd' : 'Jane Smith'}
        />
        {business && (
          <Field label="Contact person" value={draft.contact_name} onChange={set('contact_name')} />
        )}
        <Field label="Email" type="email" value={draft.email} onChange={set('email')} />
        <Field label="Phone" value={draft.phone} onChange={set('phone')} />
        {business && (
          <>
            <Field label="Company number" value={draft.company_number} onChange={set('company_number')} />
            <Field label="VAT number" value={draft.vat_number} onChange={set('vat_number')} />
          </>
        )}
      </div>

      <div className={'grid gap-3 ' + (compact ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
        <Field label="Address line 1" value={draft.address_line1} onChange={set('address_line1')} />
        <Field label="Address line 2" value={draft.address_line2} onChange={set('address_line2')} />
        <Field label="City" value={draft.city} onChange={set('city')} />
        <Field label="Postcode" value={draft.postcode} onChange={set('postcode')} />
        <Field label="Country" value={draft.country} onChange={set('country')} />
      </div>

      {!compact && (
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
            Notes <span className="ml-1 text-warmgrey/50">(optional)</span>
          </span>
          <textarea
            value={draft.notes}
            onChange={set('notes')}
            rows={2}
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
          />
        </label>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
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

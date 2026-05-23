'use client';

import { useState, useTransition } from 'react';
import { submitValuationRequest } from '@/lib/actions/valuationRequests';
import { MultiImageUploader, type SelectedFile } from './MultiImageUploader';
import type { FormVariant } from '@/types/database';

// ---------------------------------------------------------------------------
//  Branch-specific option lists. Server validates against the same sets.
// ---------------------------------------------------------------------------

const METAL_OPTIONS = ['Gold', 'Silver', 'Platinum'] as const;
const ITEM_FORM_OPTIONS = ['Coins', 'Bullion', 'Scrap', 'Jewellery', 'Other'] as const;

const CARAT_OPTIONS = [
  { value: '', label: "I'm not sure" },
  { value: '9ct', label: '9ct (37.5%)' },
  { value: '10ct', label: '10ct (41.7%)' },
  { value: '14ct', label: '14ct (58.5%)' },
  { value: '18ct', label: '18ct (75.0%)' },
  { value: '20ct', label: '20ct (83.3%)' },
  { value: '21ct', label: '21ct (87.5%)' },
  { value: '22ct', label: '22ct (91.6%)' },
  { value: '24ct', label: '24ct (99.9%)' },
];

const JEWELLERY_TYPE_OPTIONS = [
  'Ring',
  'Necklace',
  'Bracelet',
  'Earrings',
  'Pendant',
  'Other',
] as const;
const GEMSTONE_OPTIONS = ['Diamond', 'Sapphire', 'Ruby', 'Emerald', 'Other', 'None'] as const;

const WATCH_BRANDS = [
  'Rolex',
  'Patek Philippe',
  'Audemars Piguet',
  'Omega',
  'Cartier',
  'IWC',
  'Jaeger-LeCoultre',
  'Other',
] as const;

const HANDBAG_BRANDS = [
  'Hermès',
  'Chanel',
  'Louis Vuitton',
  'Dior',
  'Gucci',
  'Prada',
  'Bottega Veneta',
  'Other',
] as const;

const CONDITION_OPTIONS = ['Excellent', 'Good', 'Fair', 'Worn'] as const;
const BOX_PAPERS_OPTIONS = ['All', 'Box only', 'Papers only', 'Neither'] as const;

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

type Props = {
  /** Which branch to render. Default 'metal' (Get a Valuation button entry). */
  variant?: FormVariant;
  /** Legacy hidden item_type for back-compat reporting. */
  defaultItemType?: string;
};

export function ValuationForm({ variant = 'metal', defaultItemType }: Props) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; persisted: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  const meta = VARIANT_META[variant];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.delete('photos');
    files.forEach((f) => formData.append('photos', f.file, f.file.name));

    startTransition(async () => {
      const result = await submitValuationRequest(formData);
      if (result.ok) {
        setSuccess({ id: result.requestId, persisted: result.persisted });
        form.reset();
        setFiles([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setServerError(result.error);
      }
    });
  };

  if (success) {
    return <SuccessCard id={success.id} persisted={success.persisted} />;
  }

  return (
    <form
      id="valuation-form"
      onSubmit={onSubmit}
      className="gc-card gc-card-gold-edge space-y-7 p-6 sm:p-8"
    >
      <input type="hidden" name="form_variant" value={variant} />
      {defaultItemType && <input type="hidden" name="item_type" value={defaultItemType} />}

      <FormHeader meta={meta} variant={variant} />

      {variant === 'metal' && <MetalBranch />}
      {variant === 'jewellery' && <JewelleryBranch />}
      {variant === 'watch' && <WatchBranch />}
      {variant === 'handbag' && <HandbagBranch />}

      <Question
        number={QUESTION_NUMBER[variant].photos}
        label="Description &amp; photos"
        hint="Optional — also fine to share via WhatsApp once we're in touch."
      >
        <div className="space-y-4">
          <textarea
            name="description"
            rows={3}
            placeholder="Briefly describe your piece(s) — hallmarks, condition, age, any documents."
            className="gc-input"
          />
          <MultiImageUploader files={files} onChange={setFiles} />
        </div>
      </Question>

      <Question number={QUESTION_NUMBER[variant].contact} label="Your contact details" required>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" name="first_name" required />
          <Field label="Last name" name="last_name" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone / WhatsApp" name="phone" type="tel" required />
        </div>
        <div className="mt-4">
          <label className="gc-label">Preferred contact method</label>
          <div className="grid grid-cols-3 gap-2">
            {(['phone', 'email', 'whatsapp'] as const).map((method, i) => (
              <label
                key={method}
                className="cursor-pointer rounded-lg border border-gold-metallic/25 bg-ink-900/60 px-3 py-2.5 text-center text-sm text-white transition has-[:checked]:border-gold-metallic has-[:checked]:bg-ink-800 has-[:checked]:text-gold-bright"
              >
                <input
                  type="radio"
                  name="preferred_contact_method"
                  value={method}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </Question>

      <label className="flex items-start gap-3 text-sm text-warmgrey">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-gold-metallic" />
        <span>I agree to be contacted about my valuation request.</span>
      </label>

      {serverError && (
        <p
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <button type="submit" disabled={isPending} className="gc-btn-primary w-full sm:w-auto">
        {isPending ? 'Submitting…' : 'Request My Valuation'}
      </button>

      <p className="text-[11px] leading-relaxed text-warmgrey/70">
        Final offers depend on inspection, market price, purity verification and item condition. We never
        pressure you to sell — the decision is always yours.
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
//  Variant metadata + numbering
// ---------------------------------------------------------------------------

const VARIANT_META: Record<FormVariant, { eyebrow: string; title: string; subtitle: string }> = {
  metal: {
    eyebrow: 'Selling Gold / Silver / Platinum',
    title: 'Tell us about your precious metal',
    subtitle:
      'A few quick questions about the metal and form. Only your contact details are required — the rest helps us prepare.',
  },
  jewellery: {
    eyebrow: 'Selling Fine Jewellery',
    title: 'Tell us about your jewellery',
    subtitle:
      'Diamond rings, designer pieces, antique jewellery — give us a quick picture and a specialist will reach out.',
  },
  watch: {
    eyebrow: 'Selling a Luxury Watch',
    title: 'Tell us about your watch',
    subtitle:
      'Brand and model help us assess; movement, papers and condition all factor into the offer.',
  },
  handbag: {
    eyebrow: 'Selling a Designer Handbag',
    title: 'Tell us about your handbag',
    subtitle:
      'Brand, condition and original packaging all influence value. Photos help, but you can also send them via WhatsApp later.',
  },
};

// Each branch has a different number of variant-specific questions, so the
// shared trailing questions (description, contact) shift accordingly.
const QUESTION_NUMBER: Record<FormVariant, { photos: number; contact: number }> = {
  metal: { photos: 4, contact: 5 },
  jewellery: { photos: 4, contact: 5 },
  watch: { photos: 4, contact: 5 },
  handbag: { photos: 5, contact: 6 },
};

// ---------------------------------------------------------------------------
//  Branch components
// ---------------------------------------------------------------------------

function MetalBranch() {
  return (
    <>
      <Question number={1} label="Which metal?" required>
        <ChipGroup
          name="metal_type"
          options={METAL_OPTIONS.map((m) => ({ value: m, label: m }))}
          required
        />
      </Question>
      <Question number={2} label="What form is it in?" required>
        <ChipGroup
          name="item_category"
          options={ITEM_FORM_OPTIONS.map((c) => ({ value: c, label: c }))}
          required
        />
      </Question>
      <Question
        number={3}
        label="What carat or purity?"
        hint="Optional — leave blank if you're not sure."
      >
        <select name="carat" defaultValue="" className="gc-input max-w-sm">
          {CARAT_OPTIONS.map((c) => (
            <option key={c.value} value={c.value} className="bg-ink-950 text-white">
              {c.label}
            </option>
          ))}
        </select>
      </Question>
    </>
  );
}

function JewelleryBranch() {
  return (
    <>
      <Question number={1} label="What type of piece?" required>
        <ChipGroup
          name="jewellery_type"
          options={JEWELLERY_TYPE_OPTIONS.map((j) => ({ value: j, label: j }))}
          required
        />
      </Question>
      <Question number={2} label="Main gemstone?" hint="Optional — leave blank if none or unsure.">
        <ChipGroup
          name="gemstone"
          options={GEMSTONE_OPTIONS.map((g) => ({ value: g, label: g }))}
        />
      </Question>
      <Question number={3} label="Brand or designer?" hint="Optional — Cartier, Tiffany, Boodles, etc.">
        <input name="brand" placeholder="e.g. Cartier" className="gc-input max-w-md" />
      </Question>
    </>
  );
}

function WatchBranch() {
  return (
    <>
      <Question number={1} label="Brand?" required>
        <ChipGroup
          name="brand"
          options={WATCH_BRANDS.map((b) => ({ value: b, label: b }))}
          required
        />
      </Question>
      <Question number={2} label="Model" hint="Optional — e.g. Submariner 116610LN, Nautilus 5711.">
        <input name="model" placeholder="e.g. Submariner Date" className="gc-input max-w-md" />
      </Question>
      <Question number={3} label="Box & papers?" hint="Optional — affects valuation but not required.">
        <ChipGroup
          name="box_papers"
          options={BOX_PAPERS_OPTIONS.map((b) => ({ value: b, label: b }))}
        />
      </Question>
    </>
  );
}

function HandbagBranch() {
  return (
    <>
      <Question number={1} label="Brand?" required>
        <ChipGroup
          name="brand"
          options={HANDBAG_BRANDS.map((b) => ({ value: b, label: b }))}
          required
        />
      </Question>
      <Question number={2} label="Model" hint="Optional — e.g. Birkin 30, Classic Flap Medium.">
        <input name="model" placeholder="e.g. Birkin 30" className="gc-input max-w-md" />
      </Question>
      <Question number={3} label="Condition?" hint="Optional.">
        <ChipGroup
          name="condition"
          options={CONDITION_OPTIONS.map((c) => ({ value: c, label: c }))}
        />
      </Question>
      <Question
        number={4}
        label="Original box / dustbag / receipt?"
        hint="Optional."
      >
        <ChipGroup
          name="box_papers"
          options={BOX_PAPERS_OPTIONS.map((b) => ({ value: b, label: b }))}
        />
      </Question>
    </>
  );
}

// ---------------------------------------------------------------------------
//  Shared UI helpers
// ---------------------------------------------------------------------------

function FormHeader({
  meta,
  variant,
}: {
  meta: { eyebrow: string; title: string; subtitle: string };
  variant: FormVariant;
}) {
  return (
    <header>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="gc-eyebrow">{meta.eyebrow}</span>
          <h3 className="font-display text-xl font-semibold text-white mt-2 sm:text-2xl">
            {meta.title}
          </h3>
        </div>
        <CategorySwitcher current={variant} />
      </div>
      <p className="mt-2 text-sm text-warmgrey">{meta.subtitle}</p>
    </header>
  );
}

function CategorySwitcher({ current }: { current: FormVariant }) {
  const links: Array<{ variant: FormVariant; href: string; label: string }> = [
    { variant: 'metal', href: '/sell-gold#valuation-form', label: 'Gold / Silver / Platinum' },
    { variant: 'jewellery', href: '/sell-jewellery#valuation-form', label: 'Fine Jewellery' },
    { variant: 'watch', href: '/sell-watches#valuation-form', label: 'Luxury Watch' },
    { variant: 'handbag', href: '/sell-handbags#valuation-form', label: 'Designer Handbag' },
  ];
  const others = links.filter((l) => l.variant !== current);

  return (
    <div className="group relative hidden sm:block">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
      >
        Change
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l3 3 3-3" />
        </svg>
      </button>
      <div className="invisible absolute right-0 top-full z-10 mt-2 w-56 rounded-xl border border-gold-metallic/25 bg-ink-900/95 p-2 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
        <p className="px-3 pb-1 pt-1 text-[10px] uppercase tracking-luxe text-gold-tint">
          Selling something else?
        </p>
        {others.map((l) => (
          <a
            key={l.variant}
            href={l.href}
            className="block rounded-lg px-3 py-2 text-sm text-warmgrey hover:bg-ink-800 hover:text-gold-bright"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function Question({
  number,
  label,
  hint,
  required,
  children,
}: {
  number: number;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2.5">
        <span
          aria-hidden
          className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-[10px] font-semibold text-ink-950"
          style={{ background: 'linear-gradient(135deg, #FFD700, #D4AF37 60%, #B8860B)' }}
        >
          {number}
        </span>
        <span
          className="text-sm font-medium text-white"
          dangerouslySetInnerHTML={{ __html: label }}
        />
        {required && <span className="text-gold-metallic">*</span>}
      </div>
      {hint && <p className="mb-2 ml-9 text-[11px] text-warmgrey/80">{hint}</p>}
      <div className="ml-9">{children}</div>
    </section>
  );
}

function ChipGroup({
  name,
  options,
  required,
}: {
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {options.map((opt, i) => (
        <label
          key={opt.value}
          className="cursor-pointer rounded-lg border border-gold-metallic/25 bg-ink-900/60 px-3 py-2.5 text-center text-sm text-white transition has-[:checked]:border-gold-metallic has-[:checked]:bg-ink-800 has-[:checked]:text-gold-bright has-[:checked]:shadow-[0_0_14px_rgba(212,175,55,0.25)]"
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={required && i === 0}
            required={required}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="gc-label" htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-gold-metallic">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="gc-input"
      />
    </div>
  );
}

function SuccessCard({ id, persisted }: { id: string; persisted: boolean }) {
  return (
    <div className="gc-card gc-card-gold-edge p-8 text-center" id="valuation-form">
      <div
        className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(135deg, #FFD700, #B8860B)',
          boxShadow: '0 0 24px rgba(212,175,55,0.5)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.4">
          <path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 className="font-display text-2xl font-semibold text-white">
        Thank you — your request is with our team
      </h3>
      <p className="mt-2 text-sm text-warmgrey">
        A specialist will be in touch shortly using your preferred contact method.
      </p>
      <p className="mt-2 text-xs text-warmgrey/70">
        Reference: <span className="font-mono text-gold-tint">{id}</span>
        {!persisted && ' · Demo mode: Supabase not yet configured'}
      </p>
    </div>
  );
}

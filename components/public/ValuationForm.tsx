'use client';

import { createContext, useContext, useMemo, useState, useTransition } from 'react';
import { submitValuationRequest } from '@/lib/actions/valuationRequests';
import { MultiImageUploader, type SelectedFile } from './MultiImageUploader';
import type { FormVariant } from '@/types/database';
import {
  BOX_PAPERS_OPTIONS,
  CONDITION_OPTIONS,
  GEMSTONE_OPTIONS,
  GOLD_PURITY,
  HANDBAG_BRANDS,
  ITEM_FORM_OPTIONS,
  JEWELLERY_TYPE_OPTIONS,
  METAL_OPTIONS,
  PLATINUM_PURITY,
  SILVER_PURITY,
  WATCH_BRANDS,
  purityHintFor,
  purityLabelFor,
} from '@/lib/schemas/valuationFormOptions';

/**
 * DB-backed form-option sets supplied by the parent server page. When the
 * `options` prop isn't passed (or a particular set is empty) the form
 * falls back to the schema constants imported above — the public site
 * stays functional whether or not migration 020 has been applied yet.
 */
type DisplayOption = { value: string; label: string };
type FormOptionSets = {
  metal: DisplayOption[];
  item_form: DisplayOption[];
  jewellery_type: DisplayOption[];
  gemstone: DisplayOption[];
  watch_brand: DisplayOption[];
  handbag_brand: DisplayOption[];
  condition: DisplayOption[];
  box_papers: DisplayOption[];
  purity_gold: DisplayOption[];
  purity_silver: DisplayOption[];
  purity_platinum: DisplayOption[];
};

function buildFallbackSets(): FormOptionSets {
  const simple = (arr: readonly string[]): DisplayOption[] =>
    arr.map((v) => ({ value: v, label: v }));
  const fromPurity = (
    arr: readonly { value: string; label: string }[],
  ): DisplayOption[] =>
    arr.filter((p) => p.value.length > 0).map((p) => ({ value: p.value, label: p.label }));
  return {
    metal: simple(METAL_OPTIONS),
    item_form: simple(ITEM_FORM_OPTIONS),
    jewellery_type: simple(JEWELLERY_TYPE_OPTIONS),
    gemstone: simple(GEMSTONE_OPTIONS),
    watch_brand: simple(WATCH_BRANDS),
    handbag_brand: simple(HANDBAG_BRANDS),
    condition: simple(CONDITION_OPTIONS),
    box_papers: simple(BOX_PAPERS_OPTIONS),
    purity_gold: fromPurity(GOLD_PURITY),
    purity_silver: fromPurity(SILVER_PURITY),
    purity_platinum: fromPurity(PLATINUM_PURITY),
  };
}

const FormOptionsContext = createContext<FormOptionSets | null>(null);
function useFormOptions(): FormOptionSets {
  // Falling back at the call site (rather than passing a default to
  // createContext) lets us memoise the fallback once instead of allocating
  // it on every render when no provider is present.
  const ctx = useContext(FormOptionsContext);
  return ctx ?? FALLBACK_SETS;
}
const FALLBACK_SETS = buildFallbackSets();

function purityOptionsFor(metal: string, sets: FormOptionSets): DisplayOption[] {
  if (metal === 'Silver') return sets.purity_silver;
  if (metal === 'Platinum') return sets.purity_platinum;
  return sets.purity_gold;
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

type Props = {
  /** Which branch to render. Default 'metal' (Get a Valuation button entry). */
  variant?: FormVariant;
  /** Legacy hidden item_type for back-compat reporting. */
  defaultItemType?: string;
};

export function ValuationForm({
  variant = 'metal',
  defaultItemType,
  options,
}: Props & { options?: Partial<FormOptionSets> }) {
  // Merge any DB-backed sets passed from the server with the schema-based
  // fallback so a partial DB seed (or a single missing set) never breaks
  // the form. Memoise so re-renders don't allocate fresh option arrays.
  const mergedOptions: FormOptionSets = useMemo(() => {
    if (!options) return FALLBACK_SETS;
    return {
      metal: options.metal && options.metal.length > 0 ? options.metal : FALLBACK_SETS.metal,
      item_form:
        options.item_form && options.item_form.length > 0
          ? options.item_form
          : FALLBACK_SETS.item_form,
      jewellery_type:
        options.jewellery_type && options.jewellery_type.length > 0
          ? options.jewellery_type
          : FALLBACK_SETS.jewellery_type,
      gemstone:
        options.gemstone && options.gemstone.length > 0
          ? options.gemstone
          : FALLBACK_SETS.gemstone,
      watch_brand:
        options.watch_brand && options.watch_brand.length > 0
          ? options.watch_brand
          : FALLBACK_SETS.watch_brand,
      handbag_brand:
        options.handbag_brand && options.handbag_brand.length > 0
          ? options.handbag_brand
          : FALLBACK_SETS.handbag_brand,
      condition:
        options.condition && options.condition.length > 0
          ? options.condition
          : FALLBACK_SETS.condition,
      box_papers:
        options.box_papers && options.box_papers.length > 0
          ? options.box_papers
          : FALLBACK_SETS.box_papers,
      purity_gold:
        options.purity_gold && options.purity_gold.length > 0
          ? options.purity_gold
          : FALLBACK_SETS.purity_gold,
      purity_silver:
        options.purity_silver && options.purity_silver.length > 0
          ? options.purity_silver
          : FALLBACK_SETS.purity_silver,
      purity_platinum:
        options.purity_platinum && options.purity_platinum.length > 0
          ? options.purity_platinum
          : FALLBACK_SETS.purity_platinum,
    };
  }, [options]);

  return (
    <FormOptionsContext.Provider value={mergedOptions}>
      <ValuationFormInner variant={variant} defaultItemType={defaultItemType} />
    </FormOptionsContext.Provider>
  );
}

function ValuationFormInner({ variant = 'metal', defaultItemType }: Props) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<
    | {
        id: string;
        persisted: boolean;
        firstName: string;
        email: string;
      }
    | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const meta = VARIANT_META[variant];

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setSuccess(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Capture the customer's name + email BEFORE the form resets, so we
    // can personalise the success card with both. Failsafe defaults if
    // either field is somehow missing.
    const firstName = String(formData.get('first_name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();

    formData.delete('photos');
    files.forEach((f) => formData.append('photos', f.file, f.file.name));

    startTransition(async () => {
      const result = await submitValuationRequest(formData);
      if (result.ok) {
        setSuccess({
          id: result.requestId,
          persisted: result.persisted,
          firstName,
          email,
        });
        form.reset();
        setFiles([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setServerError(result.error);
      }
    });
  };

  if (success) {
    return (
      <SuccessCard
        id={success.id}
        persisted={success.persisted}
        firstName={success.firstName}
        email={success.email}
      />
    );
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
  // Metal branch now has 4 branch-specific questions (metal, form, purity,
  // grams), so photos becomes question 5 and contact 6.
  metal: { photos: 5, contact: 6 },
  jewellery: { photos: 4, contact: 5 },
  watch: { photos: 4, contact: 5 },
  handbag: { photos: 5, contact: 6 },
};

// ---------------------------------------------------------------------------
//  Branch components
// ---------------------------------------------------------------------------

function MetalBranch() {
  // Track the chosen metal so the purity field can swap its label and
  // option list. Default to Gold since that's the most common case and
  // matches the first (auto-checked) chip.
  const [metal, setMetal] = useState<string>('Gold');
  const opts = useFormOptions();
  const purityOptions = purityOptionsFor(metal, opts);

  return (
    <>
      <Question number={1} label="Which metal?" required>
        <ChipGroup
          name="metal_type"
          options={opts.metal}
          required
          onChange={setMetal}
        />
      </Question>
      <Question number={2} label="What form is it in?" required>
        <ChipGroup name="item_category" options={opts.item_form} required />
      </Question>
      <Question
        number={3}
        label={purityLabelFor(metal)}
        hint={purityHintFor(metal)}
      >
        {/* key forces React to remount the <select> when metal changes,
            so the chosen value resets to the new metal's default ("" /
            "I'm not sure"). Stops stale "925 silver" lingering after a
            switch to Gold. */}
        <select
          key={metal}
          name="carat"
          defaultValue=""
          className="gc-input max-w-sm"
        >
          {purityOptions.map((c) => (
            <option key={c.value} value={c.value} className="bg-ink-950 text-white">
              {c.label}
            </option>
          ))}
        </select>
      </Question>
      <Question
        number={4}
        label="Approximate weight in grams?"
        hint="Optional but helps a lot — even a rough figure narrows the valuation."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="weight_grams"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="e.g. 28.4"
            className="gc-input max-w-[200px]"
          />
          <span className="text-sm text-warmgrey">grams</span>
        </div>
      </Question>
    </>
  );
}

function JewelleryBranch() {
  const opts = useFormOptions();
  return (
    <>
      <Question number={1} label="What type of piece?" required>
        <ChipGroup name="jewellery_type" options={opts.jewellery_type} required />
      </Question>
      <Question number={2} label="Main gemstone?" hint="Optional — leave blank if none or unsure.">
        <ChipGroup name="gemstone" options={opts.gemstone} />
      </Question>
      <Question number={3} label="Brand or designer?" hint="Optional — Cartier, Tiffany, Boodles, etc.">
        <input name="brand" placeholder="e.g. Cartier" className="gc-input max-w-md" />
      </Question>
    </>
  );
}

function WatchBranch() {
  const opts = useFormOptions();
  return (
    <>
      <Question number={1} label="Brand?" required>
        <ChipGroup name="brand" options={opts.watch_brand} required />
      </Question>
      <Question number={2} label="Model" hint="Optional — e.g. Submariner 116610LN, Nautilus 5711.">
        <input name="model" placeholder="e.g. Submariner Date" className="gc-input max-w-md" />
      </Question>
      <Question number={3} label="Box & papers?" hint="Optional — affects valuation but not required.">
        <ChipGroup name="box_papers" options={opts.box_papers} />
      </Question>
    </>
  );
}

function HandbagBranch() {
  const opts = useFormOptions();
  return (
    <>
      <Question number={1} label="Brand?" required>
        <ChipGroup name="brand" options={opts.handbag_brand} required />
      </Question>
      <Question number={2} label="Model" hint="Optional — e.g. Birkin 30, Classic Flap Medium.">
        <input name="model" placeholder="e.g. Birkin 30" className="gc-input max-w-md" />
      </Question>
      <Question number={3} label="Condition?" hint="Optional.">
        <ChipGroup name="condition" options={opts.condition} />
      </Question>
      <Question
        number={4}
        label="Original box / dustbag / receipt?"
        hint="Optional."
      >
        <ChipGroup name="box_papers" options={opts.box_papers} />
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
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
  /** Optional — fires whenever the user picks a different chip. Used by
   * the metal branch to swap the purity field as the metal changes. */
  onChange?: (value: string) => void;
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
            onChange={onChange ? (e) => onChange(e.currentTarget.value) : undefined}
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

function SuccessCard({
  id,
  persisted,
  firstName,
  email,
}: {
  id: string;
  persisted: boolean;
  firstName: string;
  email: string;
}) {
  const greeting = firstName ? `Thank you, ${firstName}` : 'Thank you';
  return (
    <div
      id="valuation-form"
      className="gc-card gc-card-gold-edge p-8 text-center sm:p-10"
    >
      {/* Animated tick — subtle scale-in for a moment of satisfaction */}
      <div
        className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{
          background: 'linear-gradient(135deg, #FFD700, #B8860B)',
          boxShadow: '0 0 32px rgba(212,175,55,0.55)',
          animation: 'gcReveal 0.5s ease-out both',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.4">
          <path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">
        {greeting} — your request is with our team
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-warmgrey">
        {email ? (
          <>
            We&apos;ve sent a confirmation to{' '}
            <span className="text-gold-tint">{email}</span>. A specialist will respond within one
            business day using your preferred contact method.
          </>
        ) : (
          <>A specialist will respond within one business day using your preferred contact method.</>
        )}
      </p>

      {/* What happens next — same 3 steps as the customer confirmation email */}
      <ol className="mx-auto mt-7 max-w-md space-y-3 text-left">
        <NextStep
          n={1}
          title="Review"
          body="Our valuation team examines your photographs and supporting details."
        />
        <NextStep
          n={2}
          title="Indicative offer"
          body="We come back to you with a guide valuation and any clarifying questions."
        />
        <NextStep
          n={3}
          title="Final offer & payment"
          body="Once you're happy with the figure, we confirm in person and arrange same-day payment."
        />
      </ol>

      <p className="mt-7 text-[10px] uppercase tracking-luxe text-warmgrey/70">
        Reference{' '}
        <span className="font-mono text-gold-tint">{id.slice(0, 8)}</span>
        {!persisted && ' · Demo mode: Supabase not yet configured'}
      </p>
    </div>
  );
}

function NextStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold text-ink-950"
        style={{ background: 'linear-gradient(135deg, #A67C00, #D4AF37)' }}
      >
        {n}
      </span>
      <span className="text-sm leading-relaxed text-warmgrey">
        <strong className="text-white">{title}.</strong> {body}
      </span>
    </li>
  );
}

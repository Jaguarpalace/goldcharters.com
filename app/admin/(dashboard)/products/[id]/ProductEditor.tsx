'use client';

import { useState } from 'react';
import type { Product, ProductStatus } from '@/types/database';

const STATUSES: ProductStatus[] = ['draft', 'active', 'hidden', 'reserved', 'sold', 'out_of_stock'];

type Props =
  | { mode: 'create'; product?: undefined }
  | { mode: 'edit'; product: Product };

export function ProductEditor(props: Props) {
  const [p, setP] = useState<Partial<Product>>(
    props.mode === 'edit'
      ? props.product
      : {
          title: '',
          slug: '',
          description: '',
          retail_price: 0,
          quantity: 1,
          status: 'draft',
          visible: true,
          featured: false,
          box_included: false,
        },
  );

  const update = <K extends keyof Product>(key: K, value: Product[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The save server action is intentionally left as a stub — wire to Supabase admin client
    // once the project is connected. The form payload is fully ready to be posted.
    alert(
      'Save handler stub. Wire this up to a server action that calls supabase.from("products").upsert(...).',
    );
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-6">
        <Section title="Listing">
          <Field label="Title" value={p.title ?? ''} onChange={(v) => update('title', v)} required />
          <Field label="Slug" value={p.slug ?? ''} onChange={(v) => update('slug', v)} required />
          <TextArea label="Description" value={p.description ?? ''} onChange={(v) => update('description', v)} rows={5} />
        </Section>

        <Section title="Specification">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Metal type" value={p.metal_type ?? ''} onChange={(v) => update('metal_type', v)} />
            <Field label="Carat" value={p.carat ?? ''} onChange={(v) => update('carat', v)} />
            <Field
              label="Weight (grams)"
              type="number"
              value={String(p.weight_grams ?? '')}
              onChange={(v) => update('weight_grams', v ? Number(v) : null)}
            />
            <Field label="Gemstones" value={p.gemstones ?? ''} onChange={(v) => update('gemstones', v)} />
            <Field label="Brand" value={p.brand ?? ''} onChange={(v) => update('brand', v)} />
            <Field label="Condition" value={p.condition ?? ''} onChange={(v) => update('condition', v)} />
            <Field
              label="Certificate info"
              value={p.certificate_info ?? ''}
              onChange={(v) => update('certificate_info', v)}
              className="sm:col-span-2"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Toggle label="Original box included" value={!!p.box_included} onChange={(v) => update('box_included', v)} />
            <Toggle label="Featured" value={!!p.featured} onChange={(v) => update('featured', v)} />
            <Toggle label="Visible on site" value={p.visible ?? true} onChange={(v) => update('visible', v)} />
          </div>
        </Section>

        <Section title="Photos">
          <p className="text-sm text-warmgrey">
            Photo uploads connect to <code className="text-gold-tint">product-images</code> in Supabase
            Storage. Multiple images are supported per product; the first is treated as the main image.
          </p>
          <div className="mt-3 rounded-xl border border-dashed border-gold-metallic/40 bg-ink-900/40 px-6 py-12 text-center text-sm text-warmgrey">
            Photo manager — connect Supabase Storage to enable uploads.
          </div>
        </Section>

        <Section title="SEO">
          <Field label="SEO title" value={p.seo_title ?? ''} onChange={(v) => update('seo_title', v)} />
          <TextArea
            label="SEO description"
            value={p.seo_description ?? ''}
            onChange={(v) => update('seo_description', v)}
            rows={3}
          />
        </Section>
      </div>

      <aside className="space-y-6">
        <Section title="Pricing & Stock">
          <Field
            label="Retail price (£)"
            type="number"
            value={String(p.retail_price ?? 0)}
            onChange={(v) => update('retail_price', Number(v) || 0)}
            required
          />
          <Field
            label="Sale price (£)"
            type="number"
            value={String(p.sale_price ?? '')}
            onChange={(v) => update('sale_price', v ? Number(v) : null)}
          />
          <Field
            label="Cost price (£)"
            type="number"
            value={String(p.cost_price ?? '')}
            onChange={(v) => update('cost_price', v ? Number(v) : null)}
          />
          <Field
            label="Quantity"
            type="number"
            value={String(p.quantity ?? 1)}
            onChange={(v) => update('quantity', Number(v) || 0)}
          />
          <div>
            <label className="gc-label">Status</label>
            <select
              value={p.status ?? 'draft'}
              onChange={(e) => update('status', e.target.value as ProductStatus)}
              className="gc-input"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="bg-ink-950">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Field label="SKU" value={p.sku ?? ''} onChange={(v) => update('sku', v)} />
        </Section>

        <button type="submit" className="gc-btn-primary w-full">
          {props.mode === 'edit' ? 'Save Changes' : 'Create Product'}
        </button>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="gc-card p-6">
      <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="gc-label">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        step={type === 'number' ? 'any' : undefined}
        className="gc-input"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="gc-label">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="gc-input" />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-white">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-gold-metallic"
      />
      {label}
    </label>
  );
}

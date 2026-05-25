'use client';

import { useState, useTransition } from 'react';
import type { SiteSettings } from '@/types/database';
import { updateSiteSettingsFromForm } from '@/lib/actions/siteSettings';

export function SettingsEditor({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSiteSettingsFromForm(formData);
      if (result.ok) setFeedback({ kind: 'ok', text: 'Saved · public site refreshing' });
      else setFeedback({ kind: 'err', text: result.error });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <input type="hidden" name="id" value={s.id} />

      <Section title="Brand">
        <Field label="Business name" name="business_name" value={s.business_name} onChange={(v) => set('business_name', v)} />
        <Field label="Logo URL" name="logo_url" value={s.logo_url ?? ''} onChange={(v) => set('logo_url', v || null)} placeholder="/logo/charters_gold_true_transparent.png" />
      </Section>

      <Section title="Contact">
        <Field label="Phone" name="phone" value={s.phone} onChange={(v) => set('phone', v)} />
        <Field label="Email" name="email" type="email" value={s.email} onChange={(v) => set('email', v)} />
        <Field label="WhatsApp" name="whatsapp" value={s.whatsapp ?? ''} onChange={(v) => set('whatsapp', v || null)} />
        <Field label="Address" name="address" value={s.address ?? ''} onChange={(v) => set('address', v || null)} />
        <Field label="Opening hours" name="opening_hours" value={s.opening_hours ?? ''} onChange={(v) => set('opening_hours', v || null)} />
      </Section>

      <Section title="Top Bar (above the header)">
        <Field label="Review text" name="top_bar_review_text" value={s.top_bar_review_text ?? ''} onChange={(v) => set('top_bar_review_text', v || null)} />
        <Field label="Trust text" name="top_bar_trust_text" value={s.top_bar_trust_text ?? ''} onChange={(v) => set('top_bar_trust_text', v || null)} />
        <Field label="Payment text" name="top_bar_payment_text" value={s.top_bar_payment_text ?? ''} onChange={(v) => set('top_bar_payment_text', v || null)} />
      </Section>

      <Section title="Footer">
        <TextArea label="Footer description" name="footer_description" value={s.footer_description ?? ''} onChange={(v) => set('footer_description', v || null)} rows={4} />
        <TextArea label="Footer disclaimer" name="footer_disclaimer" value={s.footer_disclaimer ?? ''} onChange={(v) => set('footer_disclaimer', v || null)} rows={4} />
      </Section>

      <Section title="SEO (homepage default)">
        <Field label="SEO title" name="seo_title" value={s.seo_title} onChange={(v) => set('seo_title', v)} />
        <TextArea label="SEO description" name="seo_description" value={s.seo_description} onChange={(v) => set('seo_description', v)} rows={3} />
      </Section>

      <Section title="Purchase Disclaimer">
        <div className="lg:col-span-2 -mt-2 mb-1 text-[11px] text-warmgrey">
          Plain text only. Printed on the purchase document that the customer signs at the
          moment of sale. Line breaks are preserved exactly as you type them.
        </div>
        <TextArea
          label="Disclaimer text"
          name="purchase_disclaimer_text"
          value={s.purchase_disclaimer_text ?? ''}
          onChange={(v) => set('purchase_disclaimer_text', v || null)}
          rows={14}
        />
      </Section>

      <div className="flex items-center justify-between">
        {feedback ? (
          <p className={'text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        ) : <span />}
        <button type="submit" disabled={pending} className="gc-btn-primary">
          {pending ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="gc-card p-6">
      <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">{title}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="gc-label">{label}</label>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="gc-input"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="lg:col-span-2">
      <label className="gc-label">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="gc-input"
      />
    </div>
  );
}

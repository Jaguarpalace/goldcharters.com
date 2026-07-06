'use client';

import { useMemo, useState, useTransition } from 'react';
import type { SiteSettings } from '@/types/database';
import { updateSiteSettingsFromForm } from '@/lib/actions/siteSettings';

/**
 * The structured NAP fields, held as strings while editing so partial input
 * (e.g. a half-typed latitude "51.") isn't mangled by number coercion.
 * The server action parses and validates on save.
 */
type NapDraft = {
  street: string;
  locality: string;
  region: string;
  postcode: string;
  latitude: string;
  longitude: string;
};

function napFromSettings(s: SiteSettings): NapDraft {
  return {
    street: s.address_street ?? '',
    locality: s.address_locality ?? '',
    region: s.address_region ?? '',
    postcode: s.address_postcode ?? '',
    latitude: s.address_latitude?.toString() ?? '',
    longitude: s.address_longitude?.toString() ?? '',
  };
}

export function SettingsEditor({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [nap, setNap] = useState<NapDraft>(() => napFromSettings(initial));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  // Ticked by the admin to acknowledge the SEO impact of an address change.
  const [napAcknowledged, setNapAcknowledged] = useState(false);
  // Snapshot of the last-saved NAP — the warning compares against this, so
  // after a successful save the banner clears until the next change.
  const [savedNap, setSavedNap] = useState<NapDraft>(() => napFromSettings(initial));

  const napChanged = useMemo(
    () => (Object.keys(nap) as Array<keyof NapDraft>).some((k) => nap[k].trim() !== savedNap[k].trim()),
    [nap, savedNap],
  );

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const setNapField = (key: keyof NapDraft) => (v: string) =>
    setNap((prev) => ({ ...prev, [key]: v }));

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    if (napChanged && !napAcknowledged) {
      setFeedback({
        kind: 'err',
        text: 'You have changed the business address — please read the SEO warning and tick the confirmation box before saving.',
      });
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSiteSettingsFromForm(formData);
      if (result.ok) {
        setFeedback({ kind: 'ok', text: 'Saved · public site refreshing' });
        setSavedNap(nap);
        setNapAcknowledged(false);
      } else {
        setFeedback({ kind: 'err', text: result.error });
      }
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
        <Field label="Opening hours" name="opening_hours" value={s.opening_hours ?? ''} onChange={(v) => set('opening_hours', v || null)} />
      </Section>

      <Section title="Registered Business Address (NAP)">
        <div className="lg:col-span-2 -mt-2 mb-1 text-[11px] text-warmgrey">
          The single source of truth for your address. It feeds Google&apos;s structured data
          (LocalBusiness / Organization), the map coordinates, the footer, the contact page,
          legal pages and email templates — all from these fields.
        </div>
        <Field label="Street address" name="address_street" value={nap.street} onChange={setNapField('street')} placeholder="Index House, St George's Lane" />
        <Field label="Town / city" name="address_locality" value={nap.locality} onChange={setNapField('locality')} placeholder="Ascot" />
        <Field label="County" name="address_region" value={nap.region} onChange={setNapField('region')} placeholder="Berkshire" />
        <Field label="Postcode" name="address_postcode" value={nap.postcode} onChange={setNapField('postcode')} placeholder="SL5 7ET" />
        <Field label="Latitude" name="address_latitude" value={nap.latitude} onChange={setNapField('latitude')} placeholder="51.4084" />
        <Field label="Longitude" name="address_longitude" value={nap.longitude} onChange={setNapField('longitude')} placeholder="-0.6726" />
        <div className="lg:col-span-2 text-[11px] text-warmgrey">
          Coordinates: on Google Maps, right-click your building and click the numbers that
          appear — latitude first, longitude second.
        </div>

        {napChanged && (
          <div className="lg:col-span-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-amber-300">
              ⚠ You are changing the registered business address — this affects local SEO
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-200">
              <li>
                Google treats your address as a trust signal. It must match your{' '}
                <strong>Google Business Profile</strong> and directory listings exactly —
                a mismatch can lower local rankings across every town you target.
              </li>
              <li>
                Only change this for a <strong>genuine relocation</strong> — never to
                &quot;target&quot; a different town. Frequent changes look like a virtual-office
                scheme and are penalised.
              </li>
              <li>
                After saving: update your Google Business Profile, then your major citations
                (Yell, FreeIndex, social profiles). Expect a few weeks of local-ranking flux
                while Google re-verifies — this is normal for a real move.
              </li>
            </ul>
            <label className="mt-3 flex items-start gap-2 text-xs text-amber-100">
              <input
                type="checkbox"
                checked={napAcknowledged}
                onChange={(e) => setNapAcknowledged(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I understand — this is a genuine business relocation and I will update
                Google Business Profile and citations to match.
              </span>
            </label>
          </div>
        )}
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

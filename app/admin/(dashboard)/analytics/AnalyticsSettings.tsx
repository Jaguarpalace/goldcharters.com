'use client';

import { useState, useTransition } from 'react';
import { updateSiteSettings } from '@/lib/actions/siteSettings';

type Draft = {
  ga_measurement_id: string;
  google_ads_conversion_id: string;
  google_ads_conversion_label: string;
};

/**
 * Google tag configuration. The tag itself loads on the public site only
 * after a visitor accepts analytics cookies, and never on admin pages.
 * Leave the measurement id blank and nothing loads at all.
 */
export function AnalyticsSettings({ settingsId, initial }: { settingsId: string; initial: Draft }) {
  const [d, setD] = useState<Draft>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const valid =
    (!d.ga_measurement_id || /^G-[A-Z0-9]{6,14}$/i.test(d.ga_measurement_id.trim())) &&
    (!d.google_ads_conversion_id || /^AW-\d{6,14}$/i.test(d.google_ads_conversion_id.trim()));

  const save = () => {
    setFeedback(null);
    if (!valid) {
      setFeedback({ kind: 'err', text: 'The measurement id looks like G-XXXXXXXXXX and the Ads id like AW-123456789.' });
      return;
    }
    startTransition(async () => {
      const result = await updateSiteSettings(settingsId, {
        ga_measurement_id: d.ga_measurement_id.trim().toUpperCase() || null,
        google_ads_conversion_id: d.google_ads_conversion_id.trim().toUpperCase() || null,
        google_ads_conversion_label: d.google_ads_conversion_label.trim() || null,
      });
      setFeedback(
        result.ok
          ? { kind: 'ok', text: 'Saved. The tag applies on the next page load for visitors who have accepted analytics cookies.' }
          : { kind: 'err', text: result.error },
      );
    });
  };

  return (
    <section className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Google tag</h2>
      <p className="mt-1 max-w-2xl text-[11px] text-warmgrey">
        Enter the GA4 measurement id from Google Analytics (Admin, Data streams, your web stream).
        The Google Ads id and conversion label are optional; add them when an ads campaign starts so
        form submissions and bookings count as conversions. Loads only with cookie consent, never in
        the admin.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="GA4 measurement id" placeholder="G-XXXXXXXXXX" value={d.ga_measurement_id} onChange={(v) => setD((p) => ({ ...p, ga_measurement_id: v }))} />
        <Field label="Google Ads id" placeholder="AW-123456789" value={d.google_ads_conversion_id} onChange={(v) => setD((p) => ({ ...p, google_ads_conversion_id: v }))} />
        <Field label="Ads conversion label" placeholder="AbCdEfGhIj" value={d.google_ads_conversion_label} onChange={(v) => setD((p) => ({ ...p, google_ads_conversion_label: v }))} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {feedback && (
          <span className={'text-[11px] ' + (feedback.kind === 'ok' ? 'text-emerald-300' : 'text-amber-300')}>{feedback.text}</span>
        )}
      </div>
      <p className="mt-4 text-[11px] text-warmgrey">
        Events sent to Google once the tag is live: <code className="text-gold-tint">generate_lead</code> (valuation form sent),{' '}
        <code className="text-gold-tint">book_appointment</code>, <code className="text-gold-tint">phone_click</code>,{' '}
        <code className="text-gold-tint">whatsapp_click</code>, <code className="text-gold-tint">calculator_request_click</code>. Mark the first
        two as key events in Google Analytics to see them as conversions.
      </p>
    </section>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 font-mono text-sm text-white placeholder:font-sans placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

'use client';

import { useState, useTransition } from 'react';
import type { HomepageSection } from '@/types/database';
import { updateHomepageSection } from '@/lib/actions/homepageSections';
import { AdminImageUpload } from '@/components/admin/AdminImageUpload';

type LocalSection = HomepageSection & { _dirty?: boolean };

export function HomepageEditor({ initial }: { initial: HomepageSection[] }) {
  const [sections, setSections] = useState<LocalSection[]>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string; kind: 'ok' | 'err'; text: string } | null>(null);

  const update = (id: string, patch: Partial<LocalSection>) =>
    setSections((sx) => sx.map((s) => (s.id === id ? { ...s, ...patch, _dirty: true } : s)));

  const save = (section: LocalSection) => {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateHomepageSection(section.id, {
        title: section.title,
        subtitle: section.subtitle,
        body: section.body,
        cta_label: section.cta_label,
        cta_href: section.cta_href,
        image_url: section.image_url,
        display_order: section.display_order,
        visible: section.visible,
        extra: section.extra ?? null,
      });
      if (result.ok) {
        setSections((sx) =>
          sx.map((s) =>
            s.id === section.id
              ? { ...s, _dirty: false, updated_at: new Date().toISOString() }
              : s,
          ),
        );
        setFeedback({ id: section.id, kind: 'ok', text: 'Saved' });
      } else {
        setFeedback({ id: section.id, kind: 'err', text: result.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      {sections.map((s) => (
        <section
          key={s.id}
          className={
            'gc-card p-6 transition ' + (s._dirty ? 'ring-2 ring-amber-500/30' : '')
          }
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-luxe text-gold-tint">
                {s.section_key}
              </p>
              <h2 className="font-display text-xl text-white mt-1">
                {s.title || '(untitled section)'}
              </h2>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={s.visible}
                onChange={(e) => update(s.id, { visible: e.target.checked })}
                className="h-4 w-4 accent-gold-metallic"
              />
              Visible
            </label>
          </header>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Field
              label="Title"
              value={s.title ?? ''}
              onChange={(v) => update(s.id, { title: v || null })}
            />
            <Field
              label="Subtitle"
              value={s.subtitle ?? ''}
              onChange={(v) => update(s.id, { subtitle: v || null })}
            />
            <Field
              label="CTA label"
              value={s.cta_label ?? ''}
              onChange={(v) => update(s.id, { cta_label: v || null })}
            />
            <Field
              label="CTA link"
              value={s.cta_href ?? ''}
              onChange={(v) => update(s.id, { cta_href: v || null })}
              placeholder="/sell-gold"
            />
          </div>

          <div className="mt-5">
            <TextArea
              label="Body"
              value={s.body ?? ''}
              onChange={(v) => update(s.id, { body: v || null })}
              rows={4}
            />
          </div>

          <div className="mt-5">
            <AdminImageUpload
              label="Image"
              value={s.image_url}
              onChange={(url) => update(s.id, { image_url: url })}
            />
          </div>

          <ExtraEditor section={s} update={update} />

          <div className="mt-6 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-luxe text-warmgrey">
              Last updated: {new Date(s.updated_at).toLocaleString('en-GB')}
            </p>
            <div className="flex items-center gap-3">
              {feedback?.id === s.id && (
                <span
                  className={
                    'text-xs ' +
                    (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')
                  }
                >
                  {feedback.text}
                </span>
              )}
              <button
                type="button"
                onClick={() => save(s)}
                disabled={!s._dirty || pending}
                className="gc-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Saving…' : s._dirty ? 'Save Changes' : 'Saved'}
              </button>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Extra fields for sections that carry structured payloads.
 * - hero/sell_intro/jewellery_intro: array of "badges" or "bullets" — one per line
 * - valuation_explainer: array of "criteria" — one per line
 */
function ExtraEditor({
  section,
  update,
}: {
  section: HomepageSection & { _dirty?: boolean };
  update: (id: string, patch: Partial<HomepageSection & { _dirty?: boolean }>) => void;
}) {
  const extra = (section.extra ?? {}) as Record<string, unknown>;

  const arrayField = (key: string, label: string) => {
    const current = Array.isArray(extra[key]) ? (extra[key] as string[]) : [];
    return (
      <div>
        <label className="gc-label">{label} — one per line</label>
        <textarea
          value={current.join('\n')}
          onChange={(e) =>
            update(section.id, {
              extra: {
                ...extra,
                // Raw split only — no .trim(), no .filter(Boolean). Doing
                // either during typing strips trailing spaces and empty
                // lines the moment they're typed, which makes Enter and
                // Space presses appear broken. The server action trims +
                // filters at save time, so empty lines and stray
                // whitespace never persist.
                [key]: e.target.value.split('\n'),
              },
            })
          }
          rows={6}
          className="gc-input font-mono text-xs"
        />
      </div>
    );
  };

  const stringField = (key: string, label: string) => (
    <Field
      label={label}
      value={typeof extra[key] === 'string' ? (extra[key] as string) : ''}
      onChange={(v) => update(section.id, { extra: { ...extra, [key]: v || undefined } })}
    />
  );

  if (section.section_key === 'hero') {
    return (
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {stringField('secondary_cta_label', 'Secondary CTA label')}
        {stringField('secondary_cta_href', 'Secondary CTA link')}
        <div className="lg:col-span-2">{arrayField('badges', 'Hero badges')}</div>
      </div>
    );
  }
  if (section.section_key === 'sell_intro' || section.section_key === 'jewellery_intro') {
    return <div className="mt-5">{arrayField('bullets', 'Bullet points')}</div>;
  }
  if (section.section_key === 'valuation_explainer') {
    return <div className="mt-5">{arrayField('criteria', 'Valuation criteria')}</div>;
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="gc-label">{label}</label>
      <input
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="gc-input"
      />
    </div>
  );
}

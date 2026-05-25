'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { LegalPage } from '@/types/database';
import { markLegalReviewed, updateLegalPage } from '@/lib/actions/legalPages';

const SLUG_LABEL: Record<string, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
  cookies: 'Cookie Policy',
};

export function LegalBoard({ initialRows }: { initialRows: LegalPage[] }) {
  const [rows, setRows] = useState<LegalPage[]>(initialRows);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
        No legal pages found. Run migration 021 to seed the legal_pages table.
      </p>
    );
  }

  const update = (slug: string, row: LegalPage) =>
    setRows((prev) => prev.map((r) => (r.slug === slug ? row : r)));

  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <LegalRow key={r.slug} row={r} onUpdated={(next) => update(r.slug, next)} />
      ))}
    </ul>
  );
}

function LegalRow({
  row,
  onUpdated,
}: {
  row: LegalPage;
  onUpdated: (next: LegalPage) => void;
}) {
  const [form, setForm] = useState({
    eyebrow: row.eyebrow ?? '',
    title: row.title ?? '',
    intro: row.intro ?? '',
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await updateLegalPage(row.slug, {
        eyebrow: form.eyebrow || null,
        title: form.title || null,
        intro: form.intro || null,
      });
      if (result.ok && result.data) {
        onUpdated(result.data);
        setFeedback({ ok: true, text: 'Saved.' });
        setTimeout(() => setFeedback(null), 2000);
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  const markReviewed = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await markLegalReviewed(row.slug);
      if (result.ok && result.data) {
        onUpdated(result.data);
        setFeedback({ ok: true, text: 'Last reviewed stamp updated.' });
        setTimeout(() => setFeedback(null), 2000);
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  const reviewedDate = new Date(row.last_reviewed_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <li className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl text-white">
              {SLUG_LABEL[row.slug] ?? row.slug}
            </h2>
            <Link
              href={`/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-luxe text-gold-tint hover:text-gold-bright"
            >
              View public page ↗
            </Link>
          </div>
          <p className="mt-1 text-[11px] text-warmgrey">
            Last reviewed:{' '}
            <span className="text-gold-tint">{reviewedDate}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={markReviewed}
          disabled={pending}
          className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Mark reviewed today'}
        </button>
      </div>

      <form onSubmit={save} className="mt-5 space-y-3 border-t border-gold-metallic/15 pt-4">
        <p className="text-[11px] text-warmgrey">
          Overrides for the top-of-page copy. Leave blank to use the hardcoded default.
        </p>
        <Field
          label="Eyebrow"
          value={form.eyebrow}
          onChange={(v) => setForm((p) => ({ ...p, eyebrow: v }))}
          placeholder="Legal"
        />
        <Field
          label="Title"
          value={form.title}
          onChange={(v) => setForm((p) => ({ ...p, title: v }))}
          placeholder={SLUG_LABEL[row.slug]}
        />
        <label className="block">
          <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
            Intro paragraph
          </span>
          <textarea
            rows={3}
            value={form.intro}
            onChange={(e) => setForm((p) => ({ ...p, intro: e.target.value }))}
            placeholder="Opening summary shown immediately under the title."
            className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/60 focus:border-gold-metallic focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between gap-3 pt-1">
          {feedback ? (
            <p
              className={
                'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')
              }
            >
              {feedback.text}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save overrides'}
          </button>
        </div>
      </form>
    </li>
  );
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
    <label className="block">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/60 focus:border-gold-metallic focus:outline-none"
      />
    </label>
  );
}

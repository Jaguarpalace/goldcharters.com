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

/**
 * Simplified legal-pages admin. Each page exposes:
 *   - The page name + a link to the public page (read-only — the page
 *     title is set in code so admins can't accidentally rename "Terms &
 *     Conditions" to something invalid)
 *   - "Mark reviewed today" button — bumps the visible Last-updated date
 *   - One big Body editor — paste your lawyer-supplied HTML in here.
 *     Leave it blank to use the original baked-in copy.
 *
 * The old eyebrow / title / intro override fields are gone. They were
 * confusing and rarely the thing admins actually wanted to change.
 */
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
  const [body, setBody] = useState(row.body_html ?? '');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const usingDefault = (row.body_html ?? '').trim().length === 0;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const trimmed = body.trim();
    startTransition(async () => {
      const result = await updateLegalPage(row.slug, {
        body_html: trimmed.length > 0 ? trimmed : null,
      });
      if (result.ok && result.data) {
        onUpdated(result.data);
        setFeedback({
          ok: true,
          text:
            trimmed.length > 0
              ? 'Saved · public page updated.'
              : 'Cleared · reverted to default copy.',
        });
        setTimeout(() => setFeedback(null), 3000);
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
        setFeedback({ ok: true, text: 'Last-reviewed stamp updated.' });
        setTimeout(() => setFeedback(null), 2500);
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
      {/* ----------------- Page header (name + view link + reviewed) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
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
            Last reviewed: <span className="text-gold-tint">{reviewedDate}</span>
            <span className="ml-3 text-warmgrey/60">
              {usingDefault ? 'Showing baked-in default copy.' : 'Showing your custom body.'}
            </span>
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

      {/* ----------------- Body editor */}
      <form onSubmit={save} className="mt-5 space-y-3 border-t border-gold-metallic/15 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Body
          </label>
          <span className="text-[10px] text-warmgrey/70">
            {body.length.toLocaleString()} chars
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-warmgrey">
          Paste your lawyer-supplied wording here. Structure it with{' '}
          <code className="font-mono text-gold-tint">&lt;h2&gt;</code> for section
          headings,{' '}
          <code className="font-mono text-gold-tint">&lt;p&gt;</code> for
          paragraphs, and{' '}
          <code className="font-mono text-gold-tint">&lt;ul&gt;&lt;li&gt;</code>{' '}
          for bullet lists. Leave the field empty to fall back to the original
          baked-in copy.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          spellCheck={true}
          placeholder={
            usingDefault
              ? '— currently using the baked-in default. Paste your replacement copy here. —'
              : ''
          }
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-white placeholder:text-warmgrey/60 focus:border-gold-metallic focus:outline-none"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
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
            className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save body'}
          </button>
        </div>
      </form>
    </li>
  );
}

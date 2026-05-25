'use client';

import { useState, useTransition } from 'react';
import type { PageSeo } from '@/types/database';
import { updatePageSeo } from '@/lib/actions/pageSeo';

/**
 * SEO editor. Each page is an expandable card so the admin can focus on
 * one URL at a time. Inside, a live Google-SERP preview reflects what the
 * title and description will look like — char-count warnings prevent the
 * "your title got truncated" surprise.
 */
export function SeoBoard({ initialRows }: { initialRows: PageSeo[] }) {
  const [rows, setRows] = useState<PageSeo[]>(initialRows);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
        No pages found. Run migration 018 to seed the SEO table from the existing hardcoded
        metadata.
      </p>
    );
  }

  const onSaved = (slug: string, updated: PageSeo) => {
    setRows((prev) => prev.map((r) => (r.slug === slug ? updated : r)));
  };

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <SeoCard
          key={row.slug}
          row={row}
          expanded={expandedSlug === row.slug}
          onToggle={() =>
            setExpandedSlug((current) => (current === row.slug ? null : row.slug))
          }
          onSaved={(updated) => onSaved(row.slug, updated)}
        />
      ))}
    </ul>
  );
}

function SeoCard({
  row,
  expanded,
  onToggle,
  onSaved,
}: {
  row: PageSeo;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (updated: PageSeo) => void;
}) {
  return (
    <li
      className={
        'overflow-hidden rounded-lg border transition ' +
        (expanded
          ? 'border-gold-metallic/40 bg-ink-900/60'
          : 'border-gold-metallic/15 bg-ink-900/40')
      }
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-ink-900/30"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[11px] text-gold-tint">
              {row.slug}
            </code>
            <LengthChip
              label="T"
              len={row.title.length}
              soft={[30, 60]}
              hard={[5, 80]}
            />
            <LengthChip
              label="D"
              len={row.description.length}
              soft={[120, 160]}
              hard={[20, 300]}
            />
          </div>
          <div className="mt-1 truncate text-[13px] text-white">{row.title}</div>
          <div className="mt-0.5 line-clamp-1 text-[11px] text-warmgrey">
            {row.description}
          </div>
        </div>
        <svg
          className={
            'mt-1.5 h-4 w-4 flex-none text-warmgrey transition ' +
            (expanded ? 'rotate-180 text-gold-tint' : '')
          }
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {expanded && <SeoEditor row={row} onSaved={onSaved} />}
    </li>
  );
}

function SeoEditor({
  row,
  onSaved,
}: {
  row: PageSeo;
  onSaved: (updated: PageSeo) => void;
}) {
  const [form, setForm] = useState({
    title: row.title,
    description: row.description,
    keywords: (row.keywords ?? []).join(', '),
    og_title: row.og_title ?? '',
    og_description: row.og_description ?? '',
    og_image_url: row.og_image_url ?? '',
  });
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await updatePageSeo(row.slug, {
        title: form.title,
        description: form.description,
        keywords: form.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        og_title: form.og_title || null,
        og_description: form.og_description || null,
        og_image_url: form.og_image_url || null,
      });
      if (result.ok && result.data) {
        onSaved(result.data);
        setFeedback({ ok: true, text: 'Saved.' });
        setTimeout(() => setFeedback(null), 2000);
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-5 border-t border-gold-metallic/15 bg-ink-950/60 p-5"
    >
      {/* ---------------------------- Live Google preview ----------------- */}
      <GooglePreview
        slug={row.slug}
        title={form.title}
        description={form.description}
      />

      {/* ---------------------------- Title ----------------- */}
      <Field
        label="Title"
        hint={`${form.title.length} chars · 30–60 ideal · Google truncates around 60`}
        warning={form.title.length > 60 || form.title.length < 30}
      >
        <input
          type="text"
          required
          maxLength={80}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
        />
      </Field>

      {/* ---------------------------- Description ----------------- */}
      <Field
        label="Description"
        hint={`${form.description.length} chars · 120–160 ideal · Google truncates around 155`}
        warning={form.description.length > 160 || form.description.length < 120}
      >
        <textarea
          required
          maxLength={300}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
        />
      </Field>

      {/* ---------------------------- Keywords ----------------- */}
      <Field
        label="Keywords"
        hint="Comma-separated. Captured for internal reporting; modern search engines mostly ignore them."
      >
        <input
          type="text"
          value={form.keywords}
          onChange={(e) => set('keywords', e.target.value)}
          placeholder="sell gold UK, gold buyer Surrey, …"
          className="w-full rounded-md border border-gold-metallic/20 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-warmgrey/60 focus:border-gold-metallic focus:outline-none"
        />
      </Field>

      {/* ---------------------------- Social overrides ----------------- */}
      <details className="rounded-md border border-gold-metallic/15 bg-ink-900/40 p-3">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-luxe text-gold-tint">
          Social sharing (Open Graph)
        </summary>
        <div className="mt-3 space-y-3">
          <Field label="OG title (optional)" hint="Falls back to the page title.">
            <input
              type="text"
              value={form.og_title}
              onChange={(e) => set('og_title', e.target.value)}
              className="w-full rounded-md border border-gold-metallic/20 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
            />
          </Field>
          <Field
            label="OG description (optional)"
            hint="Falls back to the page description."
          >
            <textarea
              value={form.og_description}
              onChange={(e) => set('og_description', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gold-metallic/20 bg-ink-900 px-3 py-2 text-sm text-white focus:border-gold-metallic focus:outline-none"
            />
          </Field>
          <Field
            label="OG image URL (optional)"
            hint="Recommended 1200×630. Falls back to the brand logo."
          >
            <input
              type="url"
              value={form.og_image_url}
              onChange={(e) => set('og_image_url', e.target.value)}
              placeholder="https://chartersgold.co.uk/og/sell-gold.jpg"
              className="w-full rounded-md border border-gold-metallic/20 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-warmgrey/60 focus:border-gold-metallic focus:outline-none"
            />
          </Field>
        </div>
      </details>

      {/* ---------------------------- Footer ----------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-metallic/15 pt-3">
        <p className="text-[11px] text-warmgrey">
          Saved on <span className="text-white">{new Date(row.updated_at).toLocaleString('en-GB')}</span>
          {' · '}URL is locked — renames require a code-level redirect.
        </p>
        <div className="flex items-center gap-3">
          {feedback && (
            <p
              className={
                'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')
              }
            >
              {feedback.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ----------------------------- Helpers --------------------------------- */

function Field({
  label,
  hint,
  warning,
  children,
}: {
  label: string;
  hint?: string;
  warning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
        {label}
      </span>
      {children}
      {hint && (
        <span
          className={
            'block text-[10px] ' + (warning ? 'text-amber-400' : 'text-warmgrey/70')
          }
        >
          {hint}
        </span>
      )}
    </label>
  );
}

function LengthChip({
  label,
  len,
  soft,
  hard,
}: {
  label: string;
  len: number;
  soft: [number, number];
  hard: [number, number];
}) {
  const inHard = len >= hard[0] && len <= hard[1];
  const inSoft = len >= soft[0] && len <= soft[1];
  const tone = !inHard
    ? 'bg-red-500/20 text-red-300'
    : inSoft
    ? 'bg-emerald-500/15 text-emerald-300'
    : 'bg-amber-500/15 text-amber-300';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold ${tone}`}
      title={`${label}itle/description length`}
    >
      {label} {len}
    </span>
  );
}

/**
 * Live preview of how the page appears in a Google SERP. The values are
 * truncated client-side at Google's nominal cut-offs so admins see exactly
 * what visitors will see in search results.
 */
function GooglePreview({
  slug,
  title,
  description,
}: {
  slug: string;
  title: string;
  description: string;
}) {
  const displayTitle = title.length > 60 ? title.slice(0, 57) + '…' : title;
  const displayDescription =
    description.length > 155 ? description.slice(0, 152) + '…' : description;
  const url = `chartersgold.co.uk${slug === '/' ? '' : slug}`;

  return (
    <div className="rounded-md bg-white p-4 text-black shadow-inner">
      <div className="font-sans">
        <div className="text-xs text-[#202124]">{url}</div>
        <div className="mt-0.5 text-[20px] leading-snug text-[#1a0dab]">
          {displayTitle}
        </div>
        <div className="mt-0.5 text-[13px] leading-snug text-[#4d5156]">
          {displayDescription}
        </div>
      </div>
    </div>
  );
}

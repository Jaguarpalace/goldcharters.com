'use client';

import { useState, useTransition } from 'react';
import type { Review, ReviewSource } from '@/types/database';
import { deleteReview, saveReviewSummary, upsertReview } from '@/lib/actions/reviews';

type Town = { slug: string; name: string };

type SummaryDraft = {
  google_rating: string;
  google_review_count: string;
  google_reviews_url: string;
  google_write_review_url: string;
};

type Draft = {
  author_name: string;
  rating: number;
  body: string;
  review_date: string;
  source: ReviewSource;
  source_url: string;
  town_slug: string;
  featured: boolean;
  published: boolean;
  display_order: number;
};

const SOURCE_LABELS: Record<ReviewSource, string> = {
  google: 'Google',
  direct: 'Given to us directly',
  other: 'Other',
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (): Draft => ({
  author_name: '',
  rating: 5,
  body: '',
  review_date: today(),
  source: 'google',
  source_url: '',
  town_slug: '',
  featured: false,
  published: true,
  display_order: 0,
});

type Feedback = { kind: 'ok' | 'err'; text: string } | null;

export function ReviewsEditor({
  initial,
  towns,
  settingsId,
  summary: initialSummary,
}: {
  initial: Review[];
  towns: Town[];
  settingsId: string;
  summary: SummaryDraft;
}) {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryDraft>(initialSummary);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [summaryFeedback, setSummaryFeedback] = useState<Feedback>(null);

  const townName = (slug: string | null) => towns.find((t) => t.slug === slug)?.name ?? null;
  const featuredCount = reviews.filter((r) => r.featured && r.published).length;

  const saveSummary = () => {
    setSummaryFeedback(null);
    startTransition(async () => {
      const result = await saveReviewSummary({ settingsId, ...summary });
      setSummaryFeedback(
        result.ok ? { kind: 'ok', text: 'Google rating saved' } : { kind: 'err', text: result.error },
      );
    });
  };

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertReview({
        id: editingId ?? undefined,
        ...draft,
        source_url: draft.source_url || null,
        town_slug: draft.town_slug || null,
      });
      if (!result.ok) {
        setFeedback({ kind: 'err', text: result.error });
        return;
      }
      const saved = result.data!;
      setReviews((list) => (editingId ? list.map((r) => (r.id === editingId ? saved : r)) : [saved, ...list]));
      setDraft(emptyDraft());
      setEditingId(null);
      setFeedback({ kind: 'ok', text: editingId ? 'Review updated' : 'Review added' });
    });
  };

  const remove = (id: string) => {
    if (!confirm('Delete this review?')) return;
    startTransition(async () => {
      const result = await deleteReview(id);
      if (result.ok) {
        setReviews((list) => list.filter((r) => r.id !== id));
        setFeedback({ kind: 'ok', text: 'Review deleted' });
      } else {
        setFeedback({ kind: 'err', text: result.error });
      }
    });
  };

  const startEdit = (r: Review) => {
    setEditingId(r.id);
    setDraft({
      author_name: r.author_name,
      rating: r.rating,
      body: r.body,
      review_date: r.review_date,
      source: r.source,
      source_url: r.source_url ?? '',
      town_slug: r.town_slug ?? '',
      featured: r.featured,
      published: r.published,
      display_order: r.display_order,
    });
    document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  return (
    <div className="space-y-8">
      {/* The rules, kept in front of whoever is typing */}
      <section className="gc-card p-5 text-sm text-warmgrey">
        <p className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">Before you add one</p>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Real reviews only, copied word for word. Do not tidy the wording or fix the spelling.</li>
          <li>Never offer anything in return for a review.</li>
          <li>Use a first name and initial unless the customer has agreed to their full name.</li>
          <li>Keep the Google rating below up to date, so the cards are never shown as the whole picture.</li>
        </ul>
        <p className="mt-3 text-xs">
          Fake or misleadingly presented reviews are banned under the Digital Markets, Competition and Consumers Act 2024.
        </p>
      </section>

      {/* Overall Google rating */}
      <section className="gc-card gc-card-gold-edge p-6">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">Overall Google rating</h2>
        <p className="mt-2 text-sm text-warmgrey">
          Exactly as your Google Business Profile shows it. The badge stays hidden until the rating and the number of
          reviews are both filled in.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="gc-label">Rating (for example 4.9)</label>
            <input
              inputMode="decimal"
              value={summary.google_rating}
              onChange={(e) => setSummary({ ...summary, google_rating: e.target.value })}
              className="gc-input"
              placeholder="4.9"
            />
          </div>
          <div>
            <label className="gc-label">Number of Google reviews</label>
            <input
              inputMode="numeric"
              value={summary.google_review_count}
              onChange={(e) => setSummary({ ...summary, google_review_count: e.target.value })}
              className="gc-input"
              placeholder="15"
            />
          </div>
          <div>
            <label className="gc-label">Link to your reviews on Google</label>
            <input
              value={summary.google_reviews_url}
              onChange={(e) => setSummary({ ...summary, google_reviews_url: e.target.value })}
              className="gc-input"
              placeholder="https://g.page/r/..."
            />
          </div>
          <div>
            <label className="gc-label">&quot;Write a review&quot; link</label>
            <input
              value={summary.google_write_review_url}
              onChange={(e) => setSummary({ ...summary, google_write_review_url: e.target.value })}
              className="gc-input"
              placeholder="https://g.page/r/.../review"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-warmgrey">
            Both links are in your Google Business Profile under &quot;Ask for reviews&quot;.
          </p>
          <button type="button" onClick={saveSummary} disabled={pending} className="gc-btn-primary disabled:opacity-50">
            {pending ? 'Saving…' : 'Save rating'}
          </button>
        </div>
        {summaryFeedback && (
          <p className={'mt-3 text-sm ' + (summaryFeedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')}>
            {summaryFeedback.text}
          </p>
        )}
      </section>

      {/* Add / edit */}
      <section id="review-form" className="gc-card gc-card-gold-edge scroll-mt-24 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          {editingId ? 'Edit review' : 'Add a review'}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="gc-label">Customer name</label>
            <input
              value={draft.author_name}
              onChange={(e) => setDraft({ ...draft, author_name: e.target.value })}
              className="gc-input"
              placeholder="Sarah T."
            />
          </div>
          <div>
            <label className="gc-label">Stars</label>
            <select
              value={draft.rating}
              onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
              className="gc-input"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n} className="bg-ink-950">
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gc-label">Date of the review</label>
            <input
              type="date"
              value={draft.review_date}
              max={today()}
              onChange={(e) => setDraft({ ...draft, review_date: e.target.value })}
              className="gc-input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="gc-label">Review text, word for word</label>
          <textarea
            rows={5}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className="gc-input"
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="gc-label">Where it was left</label>
            <select
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value as ReviewSource })}
              className="gc-input"
            >
              {(Object.keys(SOURCE_LABELS) as ReviewSource[]).map((s) => (
                <option key={s} value={s} className="bg-ink-950">
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gc-label">Customer&apos;s town (optional)</label>
            <select
              value={draft.town_slug}
              onChange={(e) => setDraft({ ...draft, town_slug: e.target.value })}
              className="gc-input"
            >
              <option value="" className="bg-ink-950">
                No town
              </option>
              {towns.map((t) => (
                <option key={t.slug} value={t.slug} className="bg-ink-950">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gc-label">Display order (lowest first)</label>
            <input
              type="number"
              value={draft.display_order}
              onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) || 0 })}
              className="gc-input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="gc-label">Link to the review (optional)</label>
          <input
            value={draft.source_url}
            onChange={(e) => setDraft({ ...draft, source_url: e.target.value })}
            className="gc-input"
            placeholder="https://..."
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                className="h-4 w-4 accent-gold-metallic"
              />
              Feature on the homepage and sell pages
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                className="h-4 w-4 accent-gold-metallic"
              />
              Published
            </label>
          </div>
          <div className="flex items-center gap-2">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="gc-btn-secondary">
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.author_name.trim() || !draft.body.trim()}
              className="gc-btn-primary disabled:opacity-50"
            >
              {pending ? 'Saving…' : editingId ? 'Update review' : 'Add review'}
            </button>
          </div>
        </div>
        {feedback && (
          <p className={'mt-3 text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        )}
      </section>

      {/* Existing */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          Reviews ({reviews.length}) · {featuredCount} featured
        </h2>
        <p className="mt-2 text-xs text-warmgrey">
          The homepage and sell pages show the first three: featured reviews first, then by display order, then newest.
        </p>
        <ul className="mt-4 space-y-3">
          {reviews.length === 0 && (
            <li className="gc-card p-8 text-center text-sm text-warmgrey">No reviews yet - add the first one above.</li>
          )}
          {reviews.map((r) => (
            <li key={r.id} className="gc-card flex items-start justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)} · {SOURCE_LABELS[r.source]} · {r.review_date} · order {r.display_order}
                  </span>
                  {r.featured && (
                    <span className="rounded-full bg-gold-metallic/15 px-2 py-0.5 text-[9px] uppercase tracking-luxe text-gold-bright">
                      Featured
                    </span>
                  )}
                  {townName(r.town_slug) && (
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[9px] uppercase tracking-luxe text-warmgrey">
                      {townName(r.town_slug)}
                    </span>
                  )}
                  {!r.published && (
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[9px] uppercase tracking-luxe text-warmgrey">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="mt-2 font-medium text-white">{r.author_name}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-warmgrey">{r.body}</p>
              </div>
              <div className="flex flex-none flex-col gap-2">
                <button type="button" onClick={() => startEdit(r)} className="gc-btn-ghost text-[10px]">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  disabled={pending}
                  className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-amber-300"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

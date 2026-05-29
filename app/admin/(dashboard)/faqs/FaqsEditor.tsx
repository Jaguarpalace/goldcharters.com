'use client';

import { useState, useTransition } from 'react';
import type { Faq, FaqCategory } from '@/types/database';
import { deleteFaq, upsertFaq } from '@/lib/actions/faqs';
import { FAQ_CATEGORY_LABELS } from '@/lib/format';

type DraftFaq = Partial<Faq> & {
  question: string;
  answer: string;
  category: FaqCategory;
  display_order: number;
  visible: boolean;
};

const EMPTY_DRAFT: DraftFaq = {
  question: '',
  answer: '',
  category: 'selling_gold',
  display_order: 0,
  visible: true,
};

export function FaqsEditor({ initial }: { initial: Faq[] }) {
  const [faqs, setFaqs] = useState<Faq[]>(initial);
  const [draft, setDraft] = useState<DraftFaq>({ ...EMPTY_DRAFT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertFaq({
        id: editingId ?? undefined,
        category: draft.category,
        question: draft.question,
        answer: draft.answer,
        display_order: draft.display_order,
        visible: draft.visible,
      });
      if (!result.ok) {
        setFeedback({ kind: 'err', text: result.error });
        return;
      }
      const saved = result.data!;
      setFaqs((list) =>
        editingId
          ? list.map((f) => (f.id === editingId ? saved : f))
          : [...list, saved],
      );
      setDraft({ ...EMPTY_DRAFT });
      setEditingId(null);
      setFeedback({ kind: 'ok', text: editingId ? 'FAQ updated' : 'FAQ added' });
    });
  };

  const remove = (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    startTransition(async () => {
      const result = await deleteFaq(id);
      if (result.ok) {
        setFaqs((list) => list.filter((f) => f.id !== id));
        setFeedback({ kind: 'ok', text: 'FAQ deleted' });
      } else {
        setFeedback({ kind: 'err', text: result.error });
      }
    });
  };

  const startEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setDraft({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      display_order: faq.display_order,
      visible: faq.visible,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
  };

  return (
    <div className="space-y-8">
      <section className="gc-card gc-card-gold-edge p-6">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          {editingId ? 'Edit FAQ' : 'Add a new FAQ'}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="gc-label">Category</label>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as FaqCategory })}
              className="gc-input"
            >
              {(Object.keys(FAQ_CATEGORY_LABELS) as FaqCategory[]).map((c) => (
                <option key={c} value={c} className="bg-ink-950">
                  {FAQ_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gc-label">Display order</label>
            <input
              type="number"
              value={draft.display_order}
              onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) || 0 })}
              className="gc-input"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="gc-label">Question</label>
          <input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            className="gc-input"
          />
        </div>
        <div className="mt-4">
          <label className="gc-label">Answer</label>
          <textarea
            rows={4}
            value={draft.answer}
            onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            className="gc-input"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={draft.visible}
              onChange={(e) => setDraft({ ...draft, visible: e.target.checked })}
              className="h-4 w-4 accent-gold-metallic"
            />
            Visible on the public site
          </label>
          <div className="flex items-center gap-2">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="gc-btn-secondary">
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.question.trim() || !draft.answer.trim()}
              className="gc-btn-primary disabled:opacity-50"
            >
              {pending ? 'Saving…' : editingId ? 'Update FAQ' : 'Add FAQ'}
            </button>
          </div>
        </div>
        {feedback && (
          <p
            className={
              'mt-3 text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')
            }
          >
            {feedback.text}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          Existing FAQs ({faqs.length})
        </h2>
        <ul className="mt-4 space-y-3">
          {faqs.length === 0 && (
            <li className="gc-card p-8 text-center text-sm text-warmgrey">
              No FAQs yet - add the first one above.
            </li>
          )}
          {faqs.map((f) => (
            <li key={f.id} className="gc-card flex items-start justify-between gap-4 p-5">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
                    {FAQ_CATEGORY_LABELS[f.category]} · order {f.display_order}
                  </span>
                  {!f.visible && (
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[9px] uppercase tracking-luxe text-warmgrey">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="mt-2 font-medium text-white">{f.question}</p>
                <p className="mt-1 text-sm text-warmgrey">{f.answer}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(f)}
                  className="gc-btn-ghost text-[10px]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
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

'use client';

import { useState, useTransition } from 'react';
import type { Service } from '@/types/database';
import { deleteService, upsertService } from '@/lib/actions/services';

// Icon options must match the keys in components/public/ServiceCards.tsx
const ICON_OPTIONS = [
  { value: 'bars', label: 'Gold bars' },
  { value: 'ring', label: 'Ring' },
  { value: 'calculator', label: 'Calculator' },
  { value: 'box', label: 'Box' },
  { value: 'scale', label: 'Scale' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'handbag', label: 'Handbag' },
  { value: 'watch', label: 'Watch' },
];

const PATHWAY_OPTIONS = [
  { value: 'sell', label: 'Sell (we buy)' },
  { value: 'buy', label: 'Buy (we sell)' },
  { value: 'general', label: 'General' },
];

type Draft = {
  title: string;
  slug: string;
  short_description: string;
  icon_key: string;
  cta_label: string;
  cta_href: string;
  pathway: string;
  display_order: number;
  visible: boolean;
};

const EMPTY: Draft = {
  title: '',
  slug: '',
  short_description: '',
  icon_key: 'diamond',
  cta_label: '',
  cta_href: '',
  pathway: 'sell',
  display_order: 0,
  visible: true,
};

export function ServicesEditor({ initial }: { initial: Service[] }) {
  const [services, setServices] = useState<Service[]>(initial);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertService({ id: editingId ?? undefined, ...draft });
      if (!result.ok) {
        setFeedback({ kind: 'err', text: result.error });
        return;
      }
      const saved = result.data!;
      setServices((list) =>
        editingId
          ? list.map((s) => (s.id === editingId ? saved : s))
          : [...list, saved].sort((a, b) => a.display_order - b.display_order),
      );
      setDraft({ ...EMPTY });
      setEditingId(null);
      setFeedback({ kind: 'ok', text: editingId ? 'Service updated' : 'Service added' });
    });
  };

  const remove = (id: string) => {
    if (!confirm('Delete this service?')) return;
    startTransition(async () => {
      const result = await deleteService(id);
      if (result.ok) {
        setServices((list) => list.filter((s) => s.id !== id));
        setFeedback({ kind: 'ok', text: 'Deleted' });
      } else setFeedback({ kind: 'err', text: result.error });
    });
  };

  const startEdit = (svc: Service) => {
    setEditingId(svc.id);
    setDraft({
      title: svc.title,
      slug: svc.slug,
      short_description: svc.short_description,
      icon_key: svc.icon_key ?? 'diamond',
      cta_label: svc.cta_label ?? '',
      cta_href: svc.cta_href ?? '',
      pathway: svc.pathway,
      display_order: svc.display_order,
      visible: svc.visible,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <section className="gc-card gc-card-gold-edge p-6">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          {editingId ? 'Edit service' : 'Add a new service'}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="gc-label">Title</label>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="gc-input"
              placeholder="e.g. Sell Gold"
            />
          </div>
          <div>
            <label className="gc-label">Slug</label>
            <input
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              className="gc-input"
              placeholder="sell-gold"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="gc-label">Short description</label>
          <textarea
            rows={2}
            value={draft.short_description}
            onChange={(e) => setDraft({ ...draft, short_description: e.target.value })}
            className="gc-input"
            placeholder="One-sentence summary shown on the card."
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div>
            <label className="gc-label">Icon</label>
            <select
              value={draft.icon_key}
              onChange={(e) => setDraft({ ...draft, icon_key: e.target.value })}
              className="gc-input"
            >
              {ICON_OPTIONS.map((i) => (
                <option key={i.value} value={i.value} className="bg-ink-950">
                  {i.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gc-label">Pathway</label>
            <select
              value={draft.pathway}
              onChange={(e) => setDraft({ ...draft, pathway: e.target.value })}
              className="gc-input"
            >
              {PATHWAY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} className="bg-ink-950">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="gc-label">Display order</label>
            <input
              type="number"
              value={draft.display_order}
              onChange={(e) =>
                setDraft({ ...draft, display_order: parseInt(e.target.value, 10) || 0 })
              }
              className="gc-input"
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="gc-label">CTA label</label>
            <input
              value={draft.cta_label}
              onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })}
              className="gc-input"
              placeholder="e.g. Sell Gold"
            />
          </div>
          <div>
            <label className="gc-label">CTA link</label>
            <input
              value={draft.cta_href}
              onChange={(e) => setDraft({ ...draft, cta_href: e.target.value })}
              className="gc-input"
              placeholder="/sell-gold"
            />
          </div>
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
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setDraft({ ...EMPTY });
                }}
                className="gc-btn-secondary"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.title.trim() || !draft.slug.trim() || !draft.short_description.trim()}
              className="gc-btn-primary disabled:opacity-50"
            >
              {pending ? 'Saving…' : editingId ? 'Update service' : 'Add service'}
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
          Existing services ({services.length})
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.length === 0 && (
            <li className="gc-card p-8 text-center text-sm text-warmgrey md:col-span-2 lg:col-span-3">
              No services yet - add the first one above.
            </li>
          )}
          {services.map((s) => (
            <li key={s.id} className="gc-card p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-luxe text-gold-tint">
                  {s.pathway} · order {s.display_order}
                </p>
                {!s.visible && (
                  <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[9px] uppercase tracking-luxe text-warmgrey">
                    Hidden
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg text-white mt-2">{s.title}</h3>
              <p className="mt-1 text-xs text-warmgrey line-clamp-3">{s.short_description}</p>
              {s.cta_label && (
                <p className="mt-2 text-[11px] text-warmgrey/80">
                  CTA: <span className="text-gold-tint">{s.cta_label}</span> →{' '}
                  <span className="text-gold-tint">{s.cta_href}</span>
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => startEdit(s)} className="gc-btn-ghost text-[10px]">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(s.id)}
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

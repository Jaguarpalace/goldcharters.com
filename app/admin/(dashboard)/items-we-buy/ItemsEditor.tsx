'use client';

import { useState, useTransition } from 'react';
import type { ItemWeBuy } from '@/types/database';
import { deleteItem, upsertItem } from '@/lib/actions/itemsWeBuy';
import { AdminImageUpload } from '@/components/admin/AdminImageUpload';

type Draft = {
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  visible: boolean;
};

const EMPTY: Draft = {
  name: '',
  description: null,
  image_url: null,
  display_order: 0,
  visible: true,
};

export function ItemsEditor({ initial }: { initial: ItemWeBuy[] }) {
  const [items, setItems] = useState<ItemWeBuy[]>(initial);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const save = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertItem({ id: editingId ?? undefined, ...draft });
      if (!result.ok) {
        setFeedback({ kind: 'err', text: result.error });
        return;
      }
      const saved = result.data!;
      setItems((list) =>
        editingId
          ? list.map((i) => (i.id === editingId ? saved : i))
          : [...list, saved].sort((a, b) => a.display_order - b.display_order),
      );
      setDraft({ ...EMPTY });
      setEditingId(null);
      setFeedback({ kind: 'ok', text: editingId ? 'Item updated' : 'Item added' });
    });
  };

  const remove = (id: string) => {
    if (!confirm('Delete this item?')) return;
    startTransition(async () => {
      const result = await deleteItem(id);
      if (result.ok) {
        setItems((list) => list.filter((i) => i.id !== id));
        setFeedback({ kind: 'ok', text: 'Deleted' });
      } else setFeedback({ kind: 'err', text: result.error });
    });
  };

  const startEdit = (item: ItemWeBuy) => {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      display_order: item.display_order,
      visible: item.visible,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <section className="gc-card gc-card-gold-edge p-6">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          {editingId ? 'Edit item' : 'Add a new item'}
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="gc-label">Item name</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="gc-input"
              placeholder="e.g. Gold sovereigns"
            />
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
          <label className="gc-label">Description (optional)</label>
          <textarea
            rows={2}
            value={draft.description ?? ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
            className="gc-input"
          />
        </div>
        <div className="mt-4">
          <AdminImageUpload
            label="Item image (optional)"
            value={draft.image_url}
            onChange={(url) => setDraft({ ...draft, image_url: url })}
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
            Visible
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
              disabled={pending || !draft.name.trim()}
              className="gc-btn-primary disabled:opacity-50"
            >
              {pending ? 'Saving…' : editingId ? 'Update' : 'Add'}
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
          Current items ({items.length})
        </h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 && (
            <li className="gc-card p-8 text-center text-sm text-warmgrey sm:col-span-2 lg:col-span-3">
              No items yet.
            </li>
          )}
          {items.map((item) => (
            <li key={item.id} className="gc-card flex items-center gap-3 p-4">
              {item.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={item.image_url}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-ink-800" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-[10px] uppercase tracking-luxe text-gold-tint">
                  Order {item.display_order} · {item.visible ? 'Visible' : 'Hidden'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button type="button" onClick={() => startEdit(item)} className="gc-btn-ghost text-[10px]">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
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

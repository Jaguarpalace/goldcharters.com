'use client';

import { useState, useTransition } from 'react';
import type { AppointmentEvent } from '@/types/database';
import { createEvent, deleteEvent, toggleEventPublished, updateEvent } from '@/lib/actions/appointments';
import { formatDateRange } from '@/lib/appointments/slots';

type Draft = {
  title: string;
  city: string;
  venue_name: string;
  address: string;
  postcode: string;
  description: string;
  // One event = one date. Add more events for more dates.
  date: string;
  day_start_time: string;
  day_end_time: string;
  slot_minutes: number;
  is_published: boolean;
  display_order: number;
};

function todayISO(offset = 0): string {
  const d = new Date(Date.now() + offset * 86_400_000);
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const EMPTY_DRAFT: Draft = {
  title: '',
  city: '',
  venue_name: '',
  address: '',
  postcode: '',
  description: '',
  date: todayISO(7),
  day_start_time: '10:00',
  day_end_time: '17:00',
  slot_minutes: 30,
  is_published: true,
  display_order: 0,
};

function toDraft(ev: AppointmentEvent): Draft {
  return {
    title: ev.title,
    city: ev.city,
    venue_name: ev.venue_name ?? '',
    address: ev.address ?? '',
    postcode: ev.postcode ?? '',
    description: ev.description ?? '',
    date: ev.starts_on,
    day_start_time: ev.day_start_time.slice(0, 5),
    day_end_time: ev.day_end_time.slice(0, 5),
    slot_minutes: ev.slot_minutes,
    is_published: ev.is_published,
    display_order: ev.display_order,
  };
}

export function EventsEditor({ initial }: { initial: AppointmentEvent[] }) {
  const [events, setEvents] = useState<AppointmentEvent[]>(initial);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  // Show the 5 most recent first, then reveal 10 more on each "Show more".
  const [visibleCount, setVisibleCount] = useState(5);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    setFeedback(null);
    const input = {
      title: draft.title,
      city: draft.city,
      venue_name: draft.venue_name || null,
      address: draft.address || null,
      postcode: draft.postcode || null,
      description: draft.description || null,
      date: draft.date,
      day_start_time: draft.day_start_time,
      day_end_time: draft.day_end_time,
      slot_minutes: Number(draft.slot_minutes) || 30,
      is_published: draft.is_published,
      display_order: Number(draft.display_order) || 0,
    };
    startTransition(async () => {
      const result = editingId ? await updateEvent(editingId, input) : await createEvent(input);
      if (!result.ok) {
        setFeedback({ kind: 'err', text: result.error });
        return;
      }
      const saved = result.data;
      setEvents((list) =>
        editingId ? list.map((e) => (e.id === editingId ? saved : e)) : [saved, ...list],
      );
      setDraft({ ...EMPTY_DRAFT });
      setEditingId(null);
      setFeedback({ kind: 'ok', text: editingId ? 'Event updated' : 'Event added' });
    });
  };

  const startEdit = (ev: AppointmentEvent) => {
    setEditingId(ev.id);
    setDraft(toDraft(ev));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT });
  };

  // Clone an existing (often past) event into a fresh draft with future dates,
  // ready to publish again for a new visit. Saves as a brand-new event.
  const reAdd = (ev: AppointmentEvent) => {
    setEditingId(null);
    setDraft({
      ...toDraft(ev),
      date: todayISO(7),
      is_published: true,
    });
    setFeedback({ kind: 'ok', text: `Re-adding “${ev.title}” — set the new date and click Add event.` });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = (id: string) => {
    if (!confirm('Delete this event? Any bookings against it will also be removed.')) return;
    startTransition(async () => {
      const result = await deleteEvent(id);
      if (result.ok) {
        setEvents((list) => list.filter((e) => e.id !== id));
        setFeedback({ kind: 'ok', text: 'Event deleted' });
        if (editingId === id) cancelEdit();
      } else {
        setFeedback({ kind: 'err', text: result.error });
      }
    });
  };

  const togglePublish = (ev: AppointmentEvent) => {
    startTransition(async () => {
      const result = await toggleEventPublished(ev.id, !ev.is_published);
      if (result.ok) {
        setEvents((list) =>
          list.map((e) => (e.id === ev.id ? { ...e, is_published: !ev.is_published } : e)),
        );
      } else {
        setFeedback({ kind: 'err', text: result.error });
      }
    });
  };

  return (
    <div className="space-y-8">
      <section className="gc-card gc-card-gold-edge p-6">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          {editingId ? 'Edit event' : 'Add a pop-up / showroom date'}
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="gc-label">Title (main heading)</label>
            <input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Tesco — Car Park" className="gc-input" />
            <p className="mt-1 text-[11px] text-warmgrey/70">Shown to customers as the big heading.</p>
          </div>
          <div>
            <label className="gc-label">City / town</label>
            <input value={draft.city} onChange={(e) => set('city', e.target.value)} placeholder="e.g. Egham" className="gc-input" />
            <p className="mt-1 text-[11px] text-warmgrey/70">Shown beneath the title.</p>
          </div>
          <div>
            <label className="gc-label">Venue name (optional)</label>
            <input value={draft.venue_name} onChange={(e) => set('venue_name', e.target.value)} placeholder="e.g. Tesco Egham" className="gc-input" />
          </div>
          <div>
            <label className="gc-label">Address (optional)</label>
            <input value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, town" className="gc-input" />
          </div>
          <div>
            <label className="gc-label">Postcode (powers “find nearest”)</label>
            <input value={draft.postcode} onChange={(e) => set('postcode', e.target.value)} placeholder="e.g. RG12 1AA" className="gc-input" />
            <p className="mt-1 text-[11px] text-warmgrey/70">
              Geocoded automatically so customers can find their nearest location.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="gc-label">Description (optional)</label>
          <textarea rows={2} value={draft.description} onChange={(e) => set('description', e.target.value)} className="gc-input" />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="gc-label">Date</label>
            <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} className="gc-input" />
            <p className="mt-1 text-[11px] text-warmgrey/70">One date per event. Add another event for another day.</p>
          </div>
          <div>
            <label className="gc-label">Opens</label>
            <input type="time" value={draft.day_start_time} onChange={(e) => set('day_start_time', e.target.value)} className="gc-input" />
          </div>
          <div>
            <label className="gc-label">Closes</label>
            <input type="time" value={draft.day_end_time} onChange={(e) => set('day_end_time', e.target.value)} className="gc-input" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="gc-label">Slot length (minutes)</label>
            <input type="number" min={5} max={480} step={5} value={draft.slot_minutes} onChange={(e) => set('slot_minutes', Number(e.target.value) || 30)} className="gc-input" />
          </div>
          <div>
            <label className="gc-label">Display order</label>
            <input type="number" value={draft.display_order} onChange={(e) => set('display_order', Number(e.target.value) || 0)} className="gc-input" />
            <p className="mt-1 text-[11px] text-warmgrey/70">
              Lower number shows first (0 before 1, etc.) when locations aren’t being sorted by distance.
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={draft.is_published} onChange={(e) => set('is_published', e.target.checked)} className="h-4 w-4 accent-gold-metallic" />
            Published (visible on the public site)
          </label>
          <div className="flex items-center gap-2">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="gc-btn-secondary">Cancel</button>
            )}
            <button type="button" onClick={save} disabled={pending || !draft.title.trim() || !draft.city.trim()} className="gc-btn-primary disabled:opacity-50">
              {pending ? 'Saving…' : editingId ? 'Update event' : 'Add event'}
            </button>
          </div>
        </div>

        {feedback && (
          <p className={'mt-3 text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          All events ({events.length})
        </h2>
        <ul className="mt-4 space-y-3">
          {events.length === 0 && (
            <li className="gc-card p-8 text-center text-sm text-warmgrey">No events yet — add the first one above.</li>
          )}
          {events.slice(0, visibleCount).map((ev) => (
            <li key={ev.id} className="gc-card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-semibold text-white">{ev.title}</span>
                  <span className="text-[10px] uppercase tracking-luxe text-gold-tint">order {ev.display_order}</span>
                  {!ev.is_published && (
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[9px] uppercase tracking-luxe text-warmgrey">Hidden</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-warmgrey">
                  {ev.city}
                  {ev.venue_name ? ` · ${ev.venue_name}` : ''}
                </p>
                <p className="mt-1 text-[13px] text-white">
                  {formatDateRange(ev.starts_on, ev.ends_on)} · {ev.day_start_time.slice(0, 5)}–{ev.day_end_time.slice(0, 5)} · {ev.slot_minutes} min slots
                </p>
              </div>
              <div className="flex flex-row flex-wrap gap-2 sm:flex-col sm:items-end">
                <button type="button" onClick={() => startEdit(ev)} className="gc-btn-ghost text-[10px]">Edit</button>
                <button type="button" onClick={() => reAdd(ev)} className="gc-btn-ghost text-[10px]">Re-add</button>
                <button type="button" onClick={() => togglePublish(ev)} disabled={pending} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright">
                  {ev.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button type="button" onClick={() => remove(ev.id)} disabled={pending} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-amber-300">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {events.length > visibleCount && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + 10)}
              className="gc-btn-ghost"
            >
              Show more ({events.length - visibleCount} more)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

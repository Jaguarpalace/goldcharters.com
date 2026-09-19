'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { createPhoneBooking } from '@/lib/actions/valuationRequests';
import { METAL_OPTIONS, purityOptionsFor } from '@/lib/schemas/valuationFormOptions';

/**
 * "Someone rang and wants to come in." Opened from a day on the overview
 * calendar: caller's name and number, what they are bringing (item, carat,
 * grams) and the hour and minute of the visit.
 *
 * It saves an ordinary valuation request that is already Booked (see
 * createPhoneBooking), so the visit shows on the calendar, in the Valuation
 * Requests pipeline, and turns into a purchase the usual way.
 *
 * Portalled to <body>, same pattern as the reschedule BookingModal.
 */

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 8).padStart(2, '0')); // 08..19
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00..55
const METALS = [...METAL_OPTIONS, 'Other'] as const;

function todayYmd(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PhoneBookingModal({
  day,
  onClose,
  onSaved,
}: {
  /** The calendar day that was clicked, yyyy-mm-dd. */
  day: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [metal, setMetal] = useState<string>('Gold');
  const [item, setItem] = useState('');
  const [carat, setCarat] = useState('');
  const [grams, setGrams] = useState('');
  const [date, setDate] = useState(day);
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  // Escape closes; scroll is locked behind the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const when = date ? new Date(`${date}T${hour}:${minute}:00`) : null;
  const validWhen = when && !Number.isNaN(when.getTime()) ? when : null;
  const summary = validWhen
    ? validWhen.toLocaleString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const canSave = Boolean(first.trim() && last.trim() && phone.trim() && validWhen) && !pending;

  const save = () => {
    if (!validWhen) return;
    setError(null);
    startTransition(async () => {
      const result = await createPhoneBooking({
        first_name: first,
        last_name: last,
        phone,
        email: email || null,
        metal_type: metal,
        item: item || null,
        carat: carat || null,
        weight_grams: grams ? Number(grams) : null,
        notes: notes || null,
        booked_for: validWhen.toISOString(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add a phone booking"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div className="relative max-h-[92vh] w-full max-w-[620px] overflow-y-auto rounded-xl border border-gold-metallic/30 bg-ink-950 shadow-[0_0_60px_-10px_rgba(212,175,55,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-gold-metallic/15 bg-ink-900/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">Phone booking</p>
            <p className="mt-1 font-display text-lg text-white">{summary ?? 'Pick a date and time'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gold-metallic/20 px-2.5 py-1 text-[11px] uppercase tracking-luxe text-warmgrey transition hover:border-gold-metallic/50 hover:text-gold-bright"
          >
            Esc
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Who */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="gc-label">First name</label>
              <input value={first} onChange={(e) => setFirst(e.target.value)} className="gc-input" autoFocus />
            </div>
            <div>
              <label className="gc-label">Surname</label>
              <input value={last} onChange={(e) => setLast(e.target.value)} className="gc-input" />
            </div>
            <div>
              <label className="gc-label">Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="gc-input"
                placeholder="07..."
              />
            </div>
            <div>
              <label className="gc-label">Email (if they gave one)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="gc-input"
              />
            </div>
          </div>

          {/* What */}
          <div>
            <label className="gc-label">Item</label>
            <input
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="gc-input"
              placeholder="e.g. two chains and a wedding ring"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="gc-label">Metal</label>
              <select
                value={metal}
                onChange={(e) => {
                  setMetal(e.target.value);
                  setCarat('');
                }}
                className="gc-input"
              >
                {METALS.map((m) => (
                  <option key={m} value={m} className="bg-ink-950">
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gc-label">Ct</label>
              <select
                value={carat}
                onChange={(e) => setCarat(e.target.value)}
                disabled={metal === 'Other'}
                className="gc-input disabled:opacity-50"
              >
                {purityOptionsFor(metal).map((p) => (
                  <option key={p.value || 'unsure'} value={p.value} className="bg-ink-950">
                    {p.value ? p.label : 'Not sure'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gc-label">Grams</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="gc-input"
                placeholder="if they know"
              />
            </div>
          </div>

          {/* When */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="gc-label">Date</label>
              <input
                type="date"
                value={date}
                min={todayYmd()}
                onChange={(e) => setDate(e.target.value)}
                className="gc-input"
              />
            </div>
            <div>
              <label className="gc-label">Hour</label>
              <select value={hour} onChange={(e) => setHour(e.target.value)} className="gc-input">
                {HOURS.map((h) => (
                  <option key={h} value={h} className="bg-ink-950">
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="gc-label">Minute</label>
              <select value={minute} onChange={(e) => setMinute(e.target.value)} className="gc-input">
                {MINUTES.map((m) => (
                  <option key={m} value={m} className="bg-ink-950">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="gc-label">Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="gc-input"
              placeholder="Anything they said on the call"
            />
          </div>

          {error && <p className="text-sm text-amber-400">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-metallic/15 bg-ink-900/60 px-5 py-4">
          <span className="text-[11px] text-warmgrey">
            Saved as a Booked request, so it follows the normal steps when they come in.
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-[10px] uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save booking'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

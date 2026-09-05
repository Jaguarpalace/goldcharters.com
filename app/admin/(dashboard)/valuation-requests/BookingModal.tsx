'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Calendar-format modal for picking a booking's date and time. Shown when a
 * request is moved to the "Booked" stage (and again to reschedule). Pure
 * picker - the caller saves the result.
 *
 * Portalled to <body> so it floats above every stacking context, same
 * pattern as the admin search palette.
 */

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

/** Half-hour slots across the trading day. */
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 19; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hm(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BookingModal({
  customerName,
  initial,
  pending,
  onConfirm,
  onClose,
}: {
  /** Shown in the header so it's obvious whose visit is being booked. */
  customerName: string;
  /** Existing booking (ISO) when rescheduling; null for a fresh booking. */
  initial?: string | null;
  pending?: boolean;
  onConfirm: (iso: string) => void;
  onClose: () => void;
}) {
  const initialDate = initial ? new Date(initial) : null;
  const validInitial = initialDate && !Number.isNaN(initialDate.getTime()) ? initialDate : null;

  const [monthStart, setMonthStart] = useState<Date>(() => {
    const base = validInitial ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [day, setDay] = useState<string | null>(validInitial ? ymd(validInitial) : null);
  const [time, setTime] = useState<string | null>(validInitial ? hm(validInitial) : null);
  const [mounted, setMounted] = useState(false);
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

  const todayKey = ymd(new Date());

  // Build the visible grid: 6 weeks starting on the Monday on/before the 1st.
  const gridDays = useMemo(() => {
    const first = new Date(monthStart);
    const offset = (first.getDay() + 6) % 7; // Monday = 0
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthStart]);

  const monthLabel = monthStart.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) =>
    setMonthStart((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const summary =
    day && time
      ? new Date(`${day}T${time}:00`).toLocaleString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  const confirm = () => {
    if (!day || !time) return;
    const when = new Date(`${day}T${time}:00`);
    if (Number.isNaN(when.getTime())) return;
    onConfirm(when.toISOString());
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose booking date and time"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-[560px] overflow-hidden rounded-xl border border-gold-metallic/30 bg-ink-950 shadow-[0_0_60px_-10px_rgba(212,175,55,0.35)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gold-metallic/15 bg-ink-900/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
              Book appointment
            </p>
            <p className="mt-1 font-display text-lg text-white">{customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gold-metallic/20 px-2.5 py-1 text-[11px] uppercase tracking-luxe text-warmgrey transition hover:border-gold-metallic/50 hover:text-gold-bright"
          >
            Esc
          </button>
        </div>

        <div className="grid gap-0 sm:grid-cols-[1.35fr,1fr]">
          {/* ------------------------------------------------ Calendar */}
          <div className="p-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="rounded-md border border-gold-metallic/20 px-2 py-1 text-warmgrey transition hover:border-gold-metallic/50 hover:text-gold-bright"
              >
                ←
              </button>
              <span className="font-display text-sm text-white">{monthLabel}</span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="rounded-md border border-gold-metallic/20 px-2 py-1 text-warmgrey transition hover:border-gold-metallic/50 hover:text-gold-bright"
              >
                →
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <span
                  key={w}
                  className="py-1 text-[9px] font-semibold uppercase tracking-luxe text-warmgrey/70"
                >
                  {w}
                </span>
              ))}
              {gridDays.map((d) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === monthStart.getMonth();
                const isPast = key < todayKey;
                const isToday = key === todayKey;
                const isSelected = key === day;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isPast}
                    onClick={() => setDay(key)}
                    className={
                      'relative aspect-square rounded-md text-[12px] transition ' +
                      (isSelected
                        ? 'bg-gold-gradient font-semibold text-ink-950 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                        : isPast
                          ? 'cursor-not-allowed text-warmgrey/25'
                          : inMonth
                            ? 'text-white hover:bg-gold-metallic/15 hover:text-gold-bright'
                            : 'text-warmgrey/40 hover:bg-gold-metallic/10 hover:text-warmgrey') +
                      (isToday && !isSelected
                        ? ' ring-1 ring-inset ring-gold-metallic/50'
                        : '')
                    }
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------ Time */}
          <div className="border-t border-gold-metallic/15 p-5 sm:border-l sm:border-t-0">
            <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
              Time
            </p>
            <div className="mt-3 grid max-h-[236px] grid-cols-2 gap-1.5 overflow-y-auto pr-1">
              {TIME_SLOTS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTime(t)}
                  className={
                    'rounded-md border px-2 py-1.5 text-[12px] transition ' +
                    (time === t
                      ? 'border-gold-metallic bg-gold-gradient font-semibold text-ink-950'
                      : 'border-gold-metallic/15 text-warmgrey hover:border-gold-metallic/50 hover:text-gold-bright')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="text-[9px] uppercase tracking-luxe text-warmgrey/70">
                Or exact time
              </span>
              <input
                type="time"
                value={time ?? ''}
                onChange={(e) => setTime(e.target.value || null)}
                className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-900/60 px-2.5 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gold-metallic/15 bg-ink-900/60 px-5 py-4">
          <span className="text-[12px] text-warmgrey">
            {summary ? (
              <span className="text-gold-bright">{summary}</span>
            ) : (
              'Pick a date and a time'
            )}
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
              disabled={!day || !time || pending}
              onClick={confirm}
              className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Confirm booking'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

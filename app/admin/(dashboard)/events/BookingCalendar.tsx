'use client';

import { useMemo, useState } from 'react';
import type { AppointmentWithEvent } from '@/lib/actions/appointments';
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from '@/types/database';

// Slots are stored and displayed as UTC wall-clock time (see formatSlotLong),
// so the calendar groups and labels everything in UTC to stay consistent.
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
const utcDayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};
const utcTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
};

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
// Monday-first week, UK convention.
const WEEKDAY_HEAD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: 'border-gold-metallic/40 bg-ink-950/40 text-gold-bright',
  confirmed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  attended: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  cancelled: 'border-warmgrey/30 bg-ink-800 text-warmgrey',
  no_show: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

function activeCount(list: AppointmentWithEvent[]): number {
  return list.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show').length;
}

export function BookingCalendar({ appointments }: { appointments: AppointmentWithEvent[] }) {
  // Group every booking by its UTC day.
  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentWithEvent[]>();
    for (const a of appointments) {
      const key = utcDayKey(a.starts_at);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((x, y) => x.starts_at.localeCompare(y.starts_at));
    return map;
  }, [appointments]);

  // Open on the month of the soonest upcoming booking, else today's month.
  const initial = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
    const upcoming = [...byDay.keys()].filter((k) => k >= todayKey).sort();
    const seed = upcoming[0] ?? todayKey;
    const [y, m] = seed.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [byDay]);

  const [view, setView] = useState(initial);
  const [selected, setSelected] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.year, view.month, 1));
    const offset = (first.getUTCDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
    const out: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < offset; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) {
      out.push({ key: `${view.year}-${pad2(view.month + 1)}-${pad2(d)}`, day: d });
    }
    return out;
  }, [view]);

  const move = (delta: number) => {
    setSelected(null);
    setView((v) => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const todayKey = (() => {
    const n = new Date();
    return `${n.getUTCFullYear()}-${pad2(n.getUTCMonth() + 1)}-${pad2(n.getUTCDate())}`;
  })();

  const selectedList = selected ? byDay.get(selected) ?? [] : [];

  return (
    <section className="gc-card p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
          Booking calendar
        </h2>
        <span className="text-[11px] text-warmgrey/70">Click a highlighted day to see its bookings</span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        {/* ---- The month grid ---- */}
        <div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => move(-1)} className="gc-btn-ghost text-[11px]" aria-label="Previous month">
              ‹ Prev
            </button>
            <span className="font-display text-sm text-white">
              {MONTH_LONG[view.month]} {view.year}
            </span>
            <button type="button" onClick={() => move(1)} className="gc-btn-ghost text-[11px]" aria-label="Next month">
              Next ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAY_HEAD.map((w) => (
              <div key={w} className="pb-0.5 text-center text-[9px] uppercase tracking-luxe text-warmgrey/60">
                {w}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell) return <div key={`b${i}`} aria-hidden />;
              const list = byDay.get(cell.key) ?? [];
              const count = activeCount(list);
              const hasBookings = list.length > 0;
              const isSelected = selected === cell.key;
              const isToday = cell.key === todayKey;
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={!hasBookings}
                  onClick={() => setSelected(cell.key)}
                  className={
                    'relative flex h-8 items-center justify-center rounded border text-[11px] transition ' +
                    (isSelected
                      ? 'border-gold-metallic bg-gold-metallic/15 text-gold-bright shadow-[0_0_10px_-3px_rgba(212,175,55,0.6)]'
                      : hasBookings
                        ? 'border-gold-metallic/40 bg-ink-950/40 text-white hover:border-gold-metallic hover:bg-gold-metallic/10'
                        : 'border-gold-metallic/10 text-warmgrey/50 cursor-default') +
                    (isToday && !isSelected ? ' ring-1 ring-inset ring-gold-metallic/30' : '')
                  }
                >
                  <span>{cell.day}</span>
                  {hasBookings && (
                    <span className="absolute -right-1 -top-1 inline-flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gold-metallic px-1 text-[8px] font-semibold text-ink-950">
                      {count || list.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- The selected day's bookings ---- */}
        <div className="lg:border-l lg:border-gold-metallic/10 lg:pl-6">
          {!selected ? (
            <p className="text-sm text-warmgrey">
              Select a highlighted day to view its appointments, customer details and any requests.
            </p>
          ) : selectedList.length === 0 ? (
            <p className="text-sm text-warmgrey">No bookings on this day.</p>
          ) : (
            <>
              <h3 className="font-display text-base text-white">
                {(() => {
                  const [y, m, d] = selected.split('-').map(Number);
                  return `${d} ${MONTH_LONG[m - 1]} ${y}`;
                })()}
              </h3>
              <p className="mt-0.5 text-[11px] uppercase tracking-luxe text-gold-tint">
                {selectedList.length} booking{selectedList.length === 1 ? '' : 's'}
              </p>
              <ul className="mt-4 space-y-3 lg:max-h-[28rem] lg:overflow-y-auto lg:pr-1">
                {selectedList.map((a) => (
                  <li key={a.id} className="rounded-lg border border-gold-metallic/15 bg-ink-950/30 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gold-bright">{utcTime(a.starts_at)}</span>
                      <span className="text-sm font-medium text-white">
                        {a.first_name} {a.last_name}
                      </span>
                      <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-luxe ' + STATUS_STYLES[a.status]}>
                        {APPOINTMENT_STATUS_LABELS[a.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-gold-tint">
                      {a.appointment_events?.title ?? '—'}
                      {a.appointment_events?.city ? ` · ${a.appointment_events.city}` : ''}
                    </p>
                    <p className="mt-1.5 text-[12px] text-warmgrey">
                      <a href={`mailto:${a.email}`} className="hover:text-gold-bright">{a.email}</a>
                      {' · '}
                      <a href={`tel:${a.phone.replace(/\s+/g, '')}`} className="hover:text-gold-bright">{a.phone}</a>
                      {' · prefers '}
                      {a.preferred_contact_method}
                    </p>
                    {a.service_type && <p className="mt-1 text-[12px] text-warmgrey">Bringing: {a.service_type}</p>}
                    {a.notes && <p className="mt-1 text-[12px] text-warmgrey/80">“{a.notes}”</p>}
                    {a.appointment_images && a.appointment_images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {a.appointment_images.map((img) => (
                          <a
                            key={img.id}
                            href={img.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-12 w-12 overflow-hidden rounded-md border border-gold-metallic/25 transition hover:border-gold-metallic"
                            title={img.file_name ?? 'Photo'}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.image_url} alt={img.file_name ?? 'Customer photo'} className="h-full w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

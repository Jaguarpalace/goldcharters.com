'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

/**
 * Interactive bookings calendar for the admin overview - the day-to-day
 * diary. Shows every valuation-request booking (status Booked, with a
 * booked_for slot) and every pop-up appointment on one month grid; clicking
 * a day lists that day's visits with time, customer, items and where.
 */

export type CalendarBooking = {
  id: string;
  /** ISO timestamp of the visit. */
  when: string;
  kind: 'valuation' | 'popup';
  name: string;
  /** Compact item facts: "Gold · 22ct · 15.8g". */
  detail: string | null;
  /** Longer free-text description of the items. */
  description: string | null;
  /** Pop-ups: where the appointment takes place. */
  location: string | null;
  href: string;
};

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function BookingsCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const todayKey = ymd(new Date());
  const [monthStart, setMonthStart] = useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string>(todayKey);

  // Bookings grouped by local day, each day's list in time order.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const d = new Date(b.when);
      if (Number.isNaN(d.getTime())) continue;
      const key = ymd(d);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => +new Date(a.when) - +new Date(b.when));
    }
    return map;
  }, [bookings]);

  const upcomingCount = useMemo(
    () => bookings.filter((b) => +new Date(b.when) >= Date.now()).length,
    [bookings],
  );

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

  const goToday = () => {
    const n = new Date();
    setMonthStart(new Date(n.getFullYear(), n.getMonth(), 1));
    setSelected(todayKey);
  };

  const dayBookings = byDay.get(selected) ?? [];
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // When the selected day is empty, point at the next day that isn't.
  const nextBooked = useMemo(() => {
    if (dayBookings.length > 0) return null;
    const future = bookings
      .filter((b) => ymd(new Date(b.when)) > selected)
      .sort((a, b) => +new Date(a.when) - +new Date(b.when));
    return future[0] ?? null;
  }, [bookings, dayBookings.length, selected]);

  return (
    <section className="gc-card p-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Bookings
        </h2>
        <span className="text-[10px] uppercase tracking-luxe text-warmgrey">
          {upcomingCount} upcoming
        </span>
      </div>

      {/* Month navigation */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="rounded-md border border-gold-metallic/20 px-2 py-1 text-[12px] text-warmgrey transition hover:border-gold-metallic/50 hover:text-gold-bright"
        >
          ←
        </button>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm text-white">{monthLabel}</span>
          <button
            type="button"
            onClick={goToday}
            className="text-[9px] uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="rounded-md border border-gold-metallic/20 px-2 py-1 text-[12px] text-warmgrey transition hover:border-gold-metallic/50 hover:text-gold-bright"
        >
          →
        </button>
      </div>

      {/* Day grid */}
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-0.5 text-[8px] font-semibold uppercase tracking-luxe text-warmgrey/70"
          >
            {w}
          </span>
        ))}
        {gridDays.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === monthStart.getMonth();
          const count = byDay.get(key)?.length ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selected;
          const isPast = key < todayKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              className={
                'relative flex h-8 flex-col items-center justify-center rounded text-[11px] transition ' +
                (isSelected
                  ? 'bg-gold-gradient font-semibold text-ink-950 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                  : inMonth
                    ? 'text-white hover:bg-gold-metallic/15 hover:text-gold-bright'
                    : 'text-warmgrey/40 hover:bg-gold-metallic/10 hover:text-warmgrey') +
                (isToday && !isSelected ? ' ring-1 ring-inset ring-gold-metallic/50' : '')
              }
            >
              <span className="leading-none">{d.getDate()}</span>
              {count > 0 && (
                <span
                  className="mt-0.5 flex items-center gap-[2px]"
                  title={`${count} booking${count === 1 ? '' : 's'}`}
                >
                  {count <= 3 ? (
                    Array.from({ length: count }, (_, i) => (
                      <span
                        key={i}
                        className={
                          'h-[4px] w-[4px] rounded-full ' +
                          (isSelected
                            ? 'bg-ink-950'
                            : isPast
                              ? 'bg-gold-metallic/40'
                              : 'bg-gold-bright')
                        }
                      />
                    ))
                  ) : (
                    <span
                      className={
                        'text-[8px] font-semibold leading-none ' +
                        (isSelected ? 'text-ink-950' : 'text-gold-bright')
                      }
                    >
                      {count}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day */}
      <div className="mt-3 border-t border-gold-metallic/15 pt-3">
        <p className="text-[10px] font-semibold uppercase tracking-luxe text-warmgrey">
          {selectedLabel}
        </p>
        {dayBookings.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {dayBookings.map((b) => (
              <BookingRow key={`${b.kind}-${b.id}`} booking={b} />
            ))}
          </ul>
        ) : (
          <div className="mt-3 text-[12px] leading-relaxed text-warmgrey">
            No bookings this day.
            {nextBooked && (
              <button
                type="button"
                onClick={() => {
                  const d = new Date(nextBooked.when);
                  setMonthStart(new Date(d.getFullYear(), d.getMonth(), 1));
                  setSelected(ymd(d));
                }}
                className="ml-1.5 text-gold-metallic underline-offset-2 transition hover:text-gold-bright hover:underline"
              >
                Next: {nextBooked.name.split(' ')[0]},{' '}
                {new Date(nextBooked.when).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                →
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function BookingRow({ booking }: { booking: CalendarBooking }) {
  const time = new Date(booking.when).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <li>
      <Link
        href={booking.href}
        className="group flex gap-3 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-3 transition hover:border-gold-metallic/50 hover:bg-ink-900/70"
      >
        <span className="flex-none pt-0.5 font-display text-sm font-semibold text-gold-bright">
          {time}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[13px] font-medium text-white group-hover:text-gold-bright">
              {booking.name}
            </span>
            <span
              className={
                'flex-none rounded px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-luxe ' +
                (booking.kind === 'valuation'
                  ? 'bg-gold-metallic/15 text-gold-tint'
                  : 'bg-emerald-500/10 text-emerald-300')
              }
            >
              {booking.kind === 'valuation' ? 'Valuation' : 'Pop-up'}
            </span>
          </span>
          {booking.detail && (
            <span className="mt-0.5 block text-[11px] text-gold-tint/90">{booking.detail}</span>
          )}
          {booking.description && (
            <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-warmgrey">
              {booking.description}
            </span>
          )}
          {booking.location && (
            <span className="mt-0.5 block text-[10px] uppercase tracking-luxe text-warmgrey/70">
              {booking.location}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

// Pure, client-safe slot maths for the appointment booking feature.
//
// IMPORTANT: do NOT import anything from `lib/supabase/*` here — this file is
// imported by both the server (booking action, availability query) and the
// client (BookingFlow calendar), so it must stay free of server-only code.
//
// Time model: an event's daily hours are treated as UK wall-clock and pinned
// to UTC instants (10:00 means 10:00, winter or summer). Because slot identity
// is the resulting ISO string and it's generated the same way everywhere —
// calendar render, availability check, booking insert — the three always agree
// and a booked slot is matched exactly. Display labels are formatted in UTC so
// the customer always sees the same "10:00" the admin typed.

import type { AppointmentEvent } from '@/types/database';

/** Can't book a slot starting within this many minutes from now. */
export const MIN_LEAD_MINUTES = 90;
/** Don't surface slots further than this into the future. */
export const MAX_HORIZON_DAYS = 120;
/** Hard cap on generated slots per event — keeps payloads sane. */
const MAX_SLOTS_PER_EVENT = 600;

/** What the customer is bringing — drives the booking form's service select. */
export const APPOINTMENT_SERVICES = [
  'Gold & precious metals',
  'Fine & antique jewellery',
  'Luxury watch',
  'Designer handbag',
  'Something else',
] as const;

export type ComputedSlot = {
  /** ISO instant of the slot start — the slot's stable identity. */
  startsAt: string;
  /** ISO instant of the slot end. */
  endsAt: string;
  /** Display time, "HH:mm". */
  time: string;
  /** False when an active booking already holds this slot. */
  available: boolean;
};

export type ComputedDay = {
  /** YYYY-MM-DD. */
  date: string;
  /** Day-of-month number, e.g. 12. */
  dayNumber: number;
  /** "Mon", "Tue", … */
  weekdayShort: string;
  /** "Jun" */
  monthShort: string;
  /** "Thursday 12 June 2026" */
  full: string;
  slots: ComputedSlot[];
  availableCount: number;
};

export type ComputedEvent = {
  id: string;
  title: string;
  city: string;
  venue_name: string | null;
  address: string | null;
  description: string | null;
  starts_on: string;
  ends_on: string;
  /** e.g. "12–15 June 2026" */
  dateRangeLabel: string;
  days: ComputedDay[];
  availableCount: number;
  /** "Thu 12 Jun · 10:30" for the soonest free slot, or null when full. */
  nextSlotLabel: string | null;
};

/** Lighter shape for the homepage cards — no per-slot arrays. */
export type EventSummary = {
  id: string;
  title: string;
  city: string;
  venue_name: string | null;
  address: string | null;
  description: string | null;
  dateRangeLabel: string;
  availableCount: number;
  dayCount: number;
  nextSlotLabel: string | null;
};

// --- small date helpers (all UTC) ------------------------------------------

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToLabel(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

/** Instant for a given calendar day + minutes-into-day, treated as UTC. */
function instant(dateStr: string, minutes: number): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0));
}

function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function* eachDate(start: string, end: string): Generator<string> {
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  let cur = Date.UTC(ys, ms - 1, ds);
  const last = Date.UTC(ye, me - 1, de);
  while (cur <= last) {
    yield ymd(new Date(cur));
    cur += 86_400_000;
  }
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dayParts(dateStr: string) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return {
    year: y,
    month: mo,
    dayNumber: d,
    weekday,
    weekdayShort: WEEKDAY_SHORT[weekday],
    weekdayLong: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday],
    monthShort: MONTH_SHORT[mo - 1],
    monthLong: MONTH_LONG[mo - 1],
  };
}

/** "12–15 June 2026", "29 June – 2 July 2026", or "12 June 2026". */
export function formatDateRange(startsOn: string, endsOn: string): string {
  const a = dayParts(startsOn);
  const b = dayParts(endsOn);
  if (startsOn === endsOn) return `${a.dayNumber} ${a.monthLong} ${a.year}`;
  if (a.year === b.year && a.month === b.month) {
    return `${a.dayNumber}–${b.dayNumber} ${a.monthLong} ${a.year}`;
  }
  if (a.year === b.year) {
    return `${a.dayNumber} ${a.monthLong} – ${b.dayNumber} ${b.monthLong} ${a.year}`;
  }
  return `${a.dayNumber} ${a.monthLong} ${a.year} – ${b.dayNumber} ${b.monthLong} ${b.year}`;
}

// --- core ------------------------------------------------------------------

/**
 * Expand an event into its bookable days/slots, marking each slot available
 * unless its ISO start is in `bookedSet`. `now` defaults to the current time;
 * pass it explicitly for deterministic tests.
 */
export function computeEvent(
  event: AppointmentEvent,
  bookedSet: Set<string>,
  now: Date = new Date(),
): ComputedEvent {
  const startMin = timeToMinutes(event.day_start_time);
  const endMin = timeToMinutes(event.day_end_time);
  const step = Math.max(5, event.slot_minutes || 30);
  const leadCutoff = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const horizon = now.getTime() + MAX_HORIZON_DAYS * 86_400_000;
  const weekdays = event.weekdays && event.weekdays.length > 0 ? new Set(event.weekdays) : null;

  const days: ComputedDay[] = [];
  let totalAvailable = 0;
  let nextSlot: { startsAt: string; date: string; time: string } | null = null;
  let produced = 0;

  outer: for (const date of eachDate(event.starts_on, event.ends_on)) {
    const parts = dayParts(date);
    if (weekdays && !weekdays.has(parts.weekday)) continue;

    const slots: ComputedSlot[] = [];
    let dayAvailable = 0;
    for (let m = startMin; m + step <= endMin; m += step) {
      const start = instant(date, m);
      const ms = start.getTime();
      if (ms < leadCutoff) continue;
      if (ms > horizon) break outer;
      const startsAt = start.toISOString();
      const available = !bookedSet.has(startsAt);
      slots.push({
        startsAt,
        endsAt: instant(date, m + step).toISOString(),
        time: minutesToLabel(m),
        available,
      });
      if (available) {
        dayAvailable += 1;
        if (!nextSlot) nextSlot = { startsAt, date, time: minutesToLabel(m) };
      }
      if (++produced >= MAX_SLOTS_PER_EVENT) break outer;
    }

    if (slots.length > 0) {
      days.push({
        date,
        dayNumber: parts.dayNumber,
        weekdayShort: parts.weekdayShort,
        monthShort: parts.monthShort,
        full: `${parts.weekdayLong} ${parts.dayNumber} ${parts.monthLong} ${parts.year}`,
        slots,
        availableCount: dayAvailable,
      });
      totalAvailable += dayAvailable;
    }
  }

  let nextSlotLabel: string | null = null;
  if (nextSlot) {
    const p = dayParts(nextSlot.date);
    nextSlotLabel = `${p.weekdayShort} ${p.dayNumber} ${p.monthShort} · ${nextSlot.time}`;
  }

  return {
    id: event.id,
    title: event.title,
    city: event.city,
    venue_name: event.venue_name,
    address: event.address,
    description: event.description,
    starts_on: event.starts_on,
    ends_on: event.ends_on,
    dateRangeLabel: formatDateRange(event.starts_on, event.ends_on),
    days,
    availableCount: totalAvailable,
    nextSlotLabel,
  };
}

export function toSummary(ev: ComputedEvent): EventSummary {
  return {
    id: ev.id,
    title: ev.title,
    city: ev.city,
    venue_name: ev.venue_name,
    address: ev.address,
    description: ev.description,
    dateRangeLabel: ev.dateRangeLabel,
    availableCount: ev.availableCount,
    dayCount: ev.days.length,
    nextSlotLabel: ev.nextSlotLabel,
  };
}

/** Long human label for a slot start, e.g. "Thursday 12 June 2026, 10:30". */
export function formatSlotLong(startsAt: string): string {
  const d = new Date(startsAt);
  const date = ymd(d);
  const p = dayParts(date);
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  return `${p.weekdayLong} ${p.dayNumber} ${p.monthLong} ${p.year}, ${time}`;
}

/**
 * Structurally validate that `startsAt` is a real, in-window slot of `event`:
 * inside the date range, on an allowed weekday, aligned to the slot grid and
 * fully within the daily hours. Deliberately ignores lead-time / horizon /
 * availability — the booking action layers those checks on top.
 */
export function isValidSlot(event: AppointmentEvent, startsAt: string): boolean {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getUTCSeconds() !== 0 || d.getUTCMilliseconds() !== 0) return false;

  const date = ymd(d);
  if (date < event.starts_on || date > event.ends_on) return false;

  const weekday = d.getUTCDay();
  if (event.weekdays && event.weekdays.length > 0 && !event.weekdays.includes(weekday)) {
    return false;
  }

  const startMin = timeToMinutes(event.day_start_time);
  const endMin = timeToMinutes(event.day_end_time);
  const step = Math.max(5, event.slot_minutes || 30);
  const minutesIntoDay = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (minutesIntoDay < startMin) return false;
  if (minutesIntoDay + step > endMin) return false;
  return (minutesIntoDay - startMin) % step === 0;
}

/** Slot end ISO derived from a valid slot start + the event's slot length. */
export function slotEnd(event: AppointmentEvent, startsAt: string): string {
  const step = Math.max(5, event.slot_minutes || 30);
  return new Date(new Date(startsAt).getTime() + step * 60_000).toISOString();
}

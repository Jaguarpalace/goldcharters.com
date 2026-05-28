'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { bookAppointment, findNearestEvents, type NearestResult } from '@/lib/actions/appointments';
import { APPOINTMENT_SERVICES, type ComputedDay, type ComputedEvent, type ComputedSlot } from '@/lib/appointments/slots';
import { formatDistance } from '@/lib/appointments/geo';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type SuccessState = {
  reference: string;
  persisted: boolean;
  when: string;
  city: string;
  title: string;
  venue: string | null;
  address: string | null;
  startsAt: string;
  endsAt: string;
  cancelToken: string | null;
};

export function BookingFlow({
  events,
  initialEventId,
}: {
  events: ComputedEvent[];
  initialEventId?: string;
}) {
  const [eventList, setEventList] = useState<ComputedEvent[]>(events);
  const initialId =
    (initialEventId && events.some((e) => e.id === initialEventId) ? initialEventId : null) ??
    events[0]?.id ??
    '';
  const [selectedEventId, setSelectedEventId] = useState<string>(initialId);
  const [distances, setDistances] = useState<Map<string, number> | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // Locations stay hidden until the visitor searches by location — there's no
  // point a Glasgow customer scrolling past Egham before they've told us where
  // they are. A deep link (?event=) or the explicit "see all" link reveals them.
  const hasDeepLink = Boolean(initialEventId && events.some((e) => e.id === initialEventId));
  const [showAll, setShowAll] = useState<boolean>(hasDeepLink);
  const revealed = showAll || distances !== null;

  const markBooked = (eventId: string, startsAt: string) =>
    setEventList((list) =>
      list.map((e) =>
        e.id !== eventId
          ? e
          : {
              ...e,
              availableCount: Math.max(0, e.availableCount - 1),
              days: e.days.map((d) => ({
                ...d,
                availableCount: d.slots.some((s) => s.startsAt === startsAt && s.available)
                  ? Math.max(0, d.availableCount - 1)
                  : d.availableCount,
                slots: d.slots.map((s) => (s.startsAt === startsAt ? { ...s, available: false } : s)),
              })),
            },
      ),
    );

  const orderedEvents = useMemo(() => {
    if (!distances) return eventList;
    return [...eventList].sort((a, b) => {
      const da = distances.get(a.id);
      const db = distances.get(b.id);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
  }, [eventList, distances]);

  if (eventList.length === 0) return <EmptyState />;

  if (success) {
    return <SuccessCard success={success} onReset={() => setSuccess(null)} />;
  }

  const event = eventList.find((e) => e.id === selectedEventId) ?? eventList[0];

  return (
    <div className="space-y-8">
      <NearestSearch
        onResult={(res) => {
          const m = new Map(res.results.map((r) => [r.eventId, r.distanceMiles]));
          setDistances(m);
          setOriginLabel(res.originLabel);
          if (res.results[0]) setSelectedEventId(res.results[0].eventId);
        }}
      />

      {!revealed && (
        <div className="rounded-2xl border border-dashed border-gold-metallic/25 bg-ink-900/30 p-6 text-center">
          <p className="text-sm text-warmgrey">
            Enter your postcode above and we’ll show the valuation days nearest to you.
          </p>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 text-[12px] font-semibold uppercase tracking-luxe text-gold-tint underline-offset-4 hover:text-gold-bright hover:underline"
          >
            Or see all locations
          </button>
        </div>
      )}

      {revealed && (
        <>
          {/* Step 1 — choose a location */}
          <section>
            <StepHeading n={1} title="Choose a location" />
            {originLabel && (
              <p className="mt-2 text-[13px] text-warmgrey">
                Sorted by distance from <span className="text-gold-tint">{originLabel}</span>.
              </p>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {orderedEvents.map((ev) => {
                const active = ev.id === selectedEventId;
                const full = ev.availableCount === 0;
                const dist = distances?.get(ev.id);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEventId(ev.id)}
                    aria-pressed={active}
                    className={
                      'group relative rounded-2xl border p-4 text-left transition ' +
                      (active
                        ? 'border-gold-metallic bg-ink-800 shadow-[0_0_22px_rgba(243,204,15,0.18)]'
                        : 'border-gold-metallic/25 bg-ink-900/60 hover:border-gold-metallic/60 hover:bg-ink-800/70')
                    }
                  >
                    <p className="font-display text-lg font-semibold text-white">{ev.city}</p>
                    <p className="mt-0.5 text-[13px] text-warmgrey">{ev.dateRangeLabel}</p>
                    {dist != null && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-gold-tint">
                        <PinIcon />
                        {formatDistance(dist)}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-luxe">
                      {full ? (
                        <span className="text-warmgrey/70">Fully booked</span>
                      ) : (
                        <span className="text-gold-bright">{ev.availableCount} slots available</span>
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <BookingForEvent
            key={event.id}
            event={event}
            onSlotBooked={markBooked}
            onBooked={setSuccess}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Nearest-location search
// ---------------------------------------------------------------------------

function NearestSearch({ onResult }: { onResult: (res: Extract<NearestResult, { ok: true }>) => void }) {
  const [postcode, setPostcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [geoPending, setGeoPending] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (args: { postcode?: string; lat?: number; lng?: number }) => {
    startTransition(async () => {
      const res = await findNearestEvents(args);
      setGeoPending(false);
      if (res.ok) {
        setError(null);
        onResult(res);
      } else {
        setError(res.error);
      }
    });
  };

  const onPostcodeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    run({ postcode });
  };

  const useMyLocation = () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Your browser can’t share location — please enter your postcode.');
      return;
    }
    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => run({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setGeoPending(false);
        setError('We couldn’t access your location — please enter your postcode instead.');
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <section className="gc-card gc-card-gold-edge p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="text-gold-metallic"><PinIcon /></span>
        <h2 className="font-display text-lg font-semibold text-white">Find your nearest location</h2>
      </div>
      <p className="mt-1 text-[13px] text-warmgrey">
        Enter your postcode and we’ll sort our valuation days by distance — closest first.
      </p>
      <form onSubmit={onPostcodeSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="e.g. SW1A 1AA"
          aria-label="Your postcode"
          autoComplete="postal-code"
          className="gc-input sm:max-w-xs"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="gc-btn-primary whitespace-nowrap disabled:opacity-60">
            {pending && !geoPending ? 'Searching…' : 'Find nearest'}
          </button>
          <button type="button" onClick={useMyLocation} disabled={pending} className="gc-btn-secondary whitespace-nowrap disabled:opacity-60">
            {geoPending ? 'Locating…' : 'Use my location'}
          </button>
        </div>
      </form>
      {error && (
        <p className="mt-3 text-sm text-amber-300" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
//  Calendar + slots + form for the selected event
// ---------------------------------------------------------------------------

function BookingForEvent({
  event,
  onSlotBooked,
  onBooked,
}: {
  event: ComputedEvent;
  onSlotBooked: (eventId: string, startsAt: string) => void;
  onBooked: (success: SuccessState) => void;
}) {
  const dayMap = useMemo(() => {
    const m = new Map<string, ComputedDay>();
    for (const d of event.days) m.set(d.date, d);
    return m;
  }, [event]);

  const firstAvailable = event.days.find((d) => d.availableCount > 0) ?? event.days[0] ?? null;

  const [selectedDate, setSelectedDate] = useState<string>(firstAvailable?.date ?? '');
  const [selectedSlot, setSelectedSlot] = useState<ComputedSlot | null>(null);
  const [viewMonth, setViewMonth] = useState<{ y: number; m: number }>(() => {
    const base = firstAvailable?.date ?? event.days[0]?.date ?? new Date().toISOString().slice(0, 10);
    const [y, m] = base.split('-').map(Number);
    return { y, m: m - 1 };
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const monthBounds = useMemo(() => {
    if (event.days.length === 0) return null;
    const toKey = (date: string) => {
      const [y, m] = date.split('-').map(Number);
      return y * 12 + (m - 1);
    };
    const keys = event.days.map((d) => toKey(d.date));
    return { min: Math.min(...keys), max: Math.max(...keys) };
  }, [event]);

  const viewKey = viewMonth.y * 12 + viewMonth.m;
  const canPrev = monthBounds ? viewKey > monthBounds.min : false;
  const canNext = monthBounds ? viewKey < monthBounds.max : false;

  const selectedDay = selectedDate ? dayMap.get(selectedDate) ?? null : null;

  const onPickSlot = (slot: ComputedSlot) => {
    setSelectedSlot(slot);
    setServerError(null);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setServerError(null);
    const fd = new FormData(e.currentTarget);
    const slot = selectedSlot;

    const payload = {
      eventId: event.id,
      startsAt: slot.startsAt,
      firstName: String(fd.get('first_name') ?? ''),
      lastName: String(fd.get('last_name') ?? ''),
      email: String(fd.get('email') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      serviceType: String(fd.get('service_type') ?? '') || null,
      notes: String(fd.get('notes') ?? '') || null,
      preferredContactMethod: String(fd.get('preferred_contact_method') ?? 'phone'),
      consent: fd.get('consent') === 'on',
    };

    startTransition(async () => {
      const result = await bookAppointment(payload);
      if (result.ok) {
        onSlotBooked(event.id, slot.startsAt);
        onBooked({
          reference: result.reference,
          persisted: result.persisted,
          when: result.when,
          city: event.city,
          title: event.title,
          venue: event.venue_name,
          address: event.address,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          cancelToken: result.cancelToken,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setServerError(result.error);
        if (result.code === 'SLOT_TAKEN') {
          setSelectedSlot(null);
          onSlotBooked(event.id, slot.startsAt);
        }
      }
    });
  };

  return (
    <>
      {/* Step 2 — pick a date + time */}
      <section>
        <StepHeading n={2} title="Pick a date & time" />
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,340px),1fr]">
          <div className="gc-card gc-card-gold-edge p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => canPrev && setViewMonth(shiftMonth(viewMonth, -1))}
                disabled={!canPrev}
                aria-label="Previous month"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold-metallic/30 text-gold-metallic transition enabled:hover:border-gold-metallic enabled:hover:text-gold-bright disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <p className="text-sm font-semibold text-white">{MONTHS[viewMonth.m]} {viewMonth.y}</p>
              <button
                type="button"
                onClick={() => canNext && setViewMonth(shiftMonth(viewMonth, 1))}
                disabled={!canNext}
                aria-label="Next month"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold-metallic/30 text-gold-metallic transition enabled:hover:border-gold-metallic enabled:hover:text-gold-bright disabled:opacity-30"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_HEADERS.map((w) => (
                <div key={w} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-warmgrey/70">{w}</div>
              ))}
              {buildMonthCells(viewMonth.y, viewMonth.m).map((cell, i) => {
                if (cell === null) return <div key={`b-${i}`} aria-hidden />;
                const day = dayMap.get(cell.date);
                const bookable = !!day && day.availableCount > 0;
                const fullDay = !!day && day.availableCount === 0;
                const isSelected = cell.date === selectedDate;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={!bookable}
                    onClick={() => { setSelectedDate(cell.date); setSelectedSlot(null); }}
                    className={
                      'relative aspect-square rounded-lg text-sm transition ' +
                      (isSelected
                        ? 'bg-gradient-to-br from-gold-bright to-gold-deep font-semibold text-ink-950'
                        : bookable
                          ? 'text-white hover:bg-ink-800 ring-1 ring-gold-metallic/30'
                          : fullDay
                            ? 'text-warmgrey/40 line-through'
                            : 'text-warmgrey/25')
                    }
                  >
                    {cell.dayNumber}
                    {bookable && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-gold-bright" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-2 text-[11px] text-warmgrey/70">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-bright" aria-hidden />
              Days with availability
            </p>
          </div>

          <div>
            {selectedDay ? (
              <>
                <p className="text-sm font-medium text-white">{selectedDay.full}</p>
                <p className="mt-0.5 text-[12px] text-warmgrey">
                  {selectedDay.availableCount > 0
                    ? `${selectedDay.availableCount} time${selectedDay.availableCount === 1 ? '' : 's'} available · ${event.city}`
                    : 'No times left on this day'}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {selectedDay.slots.map((slot) => {
                    const active = selectedSlot?.startsAt === slot.startsAt;
                    return (
                      <button
                        key={slot.startsAt}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => onPickSlot(slot)}
                        className={
                          'rounded-lg border px-2 py-2.5 text-center text-sm transition ' +
                          (active
                            ? 'border-gold-metallic bg-gold-metallic/15 font-semibold text-gold-bright shadow-[0_0_14px_rgba(243,204,15,0.25)]'
                            : slot.available
                              ? 'border-gold-metallic/25 bg-ink-900/60 text-white hover:border-gold-metallic/60 hover:bg-ink-800'
                              : 'cursor-not-allowed border-transparent bg-ink-900/30 text-warmgrey/30 line-through')
                        }
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-warmgrey">Select a highlighted day to see available times.</p>
            )}
          </div>
        </div>
      </section>

      {/* Step 3 — details */}
      {selectedSlot && (
        <section>
          <StepHeading n={3} title="Your details" />
          <form ref={formRef} onSubmit={onSubmit} className="mt-4 gc-card gc-card-gold-edge space-y-6 p-6 sm:p-7">
            <div className="rounded-xl border border-gold-metallic/20 bg-ink-950/50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Your appointment</p>
              <p className="mt-1 text-white">{event.city} · {selectedDay?.full}, {selectedSlot.time}</p>
              {event.venue_name && <p className="mt-0.5 text-[13px] text-warmgrey">{event.venue_name}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" name="first_name" required />
              <Field label="Last name" name="last_name" required />
              <Field label="Email" name="email" type="email" required />
              <Field label="Phone / WhatsApp" name="phone" type="tel" required />
            </div>

            <div>
              <label className="gc-label" htmlFor="service_type">What are you bringing?</label>
              <select id="service_type" name="service_type" defaultValue="" className="gc-input">
                <option value="" className="bg-ink-950 text-white">Prefer not to say</option>
                {APPOINTMENT_SERVICES.map((s) => (
                  <option key={s} value={s} className="bg-ink-950 text-white">{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="gc-label">Preferred contact method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['phone', 'email', 'whatsapp'] as const).map((method, i) => (
                  <label
                    key={method}
                    className="cursor-pointer rounded-lg border border-gold-metallic/25 bg-ink-900/60 px-3 py-2.5 text-center text-sm text-white transition has-[:checked]:border-gold-metallic has-[:checked]:bg-ink-800 has-[:checked]:text-gold-bright"
                  >
                    <input type="radio" name="preferred_contact_method" value={method} defaultChecked={i === 0} className="sr-only" />
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="gc-label" htmlFor="notes">Anything we should know? (optional)</label>
              <textarea id="notes" name="notes" rows={3} placeholder="e.g. an 18ct chain and a Rolex Datejust" className="gc-input" />
            </div>

            <label className="flex items-start gap-3 text-sm text-warmgrey">
              <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-gold-metallic" />
              <span>I agree to be contacted about this appointment.</span>
            </label>

            {serverError && (
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300" role="alert">
                {serverError}
              </p>
            )}

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <button type="submit" disabled={isPending} className="gc-btn-primary w-full sm:w-auto">
                {isPending ? 'Confirming…' : 'Confirm appointment'}
              </button>
              <p className="text-[11px] leading-relaxed text-warmgrey/70">
                No obligation to sell. Please bring valid photo ID to your appointment.
              </p>
            </div>
          </form>
        </section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
//  Success
// ---------------------------------------------------------------------------

function SuccessCard({ success, onReset }: { success: SuccessState; onReset: () => void }) {
  const icsHref = useMemo(() => buildIcsHref(success), [success]);
  const googleHref = useMemo(() => buildGoogleCalendarUrl(success), [success]);

  return (
    <div className="gc-card gc-card-gold-edge p-8 text-center sm:p-10">
      <div
        className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: 'linear-gradient(135deg, #FFD700, #B8860B)', boxShadow: '0 0 32px rgba(243,204,15,0.55)', animation: 'gcReveal 0.5s ease-out both' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.4"><path d="M5 12l4 4 10-10" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      <h3 className="font-display text-2xl font-semibold text-white sm:text-3xl">Your appointment is confirmed</h3>

      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gold-metallic/20 bg-ink-950/50 p-5 text-left">
        <Row label="When" value={success.when} />
        <Row label="Where" value={`${success.title} — ${success.city}`} />
        {success.venue && <Row label="Venue" value={success.venue} />}
        {success.address && <Row label="Address" value={success.address} />}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a href={googleHref} target="_blank" rel="noopener noreferrer" className="gc-btn-primary">
          Add to Google Calendar
        </a>
        <a href={icsHref} download="charters-gold-appointment.ics" className="gc-btn-secondary">
          Apple / Outlook (.ics)
        </a>
        <button type="button" onClick={onReset} className="gc-btn-ghost">Book another</button>
      </div>

      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-warmgrey">
        {success.persisted
          ? 'A confirmation has been sent to your email with a link to cancel if your plans change.'
          : 'Demo mode — Supabase isn’t connected, so this booking wasn’t saved and no email was sent.'}
      </p>

      <p className="mt-6 text-[10px] uppercase tracking-luxe text-warmgrey/70">
        Reference <span className="font-mono text-gold-tint">{success.reference}</span>
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gold-metallic/10 py-2 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{label}</span>
      <span className="text-right text-sm text-white">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Shared bits
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="gc-card gc-card-gold-edge p-8 text-center sm:p-12">
      <h3 className="font-display text-2xl font-semibold text-white">No upcoming dates just yet</h3>
      <p className="mx-auto mt-3 max-w-md text-sm text-warmgrey">
        We don’t have any open appointment dates published right now. Request a private valuation and a
        specialist will be in touch to arrange a time that suits you.
      </p>
      <a href="/sell-gold#valuation-form" className="gc-btn-primary mt-6 inline-flex">Request a valuation</a>
    </div>
  );
}

function StepHeading({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-semibold text-ink-950"
        style={{ background: 'linear-gradient(135deg, #FFD700, #D4AF37 60%, #B8860B)' }}
      >
        {n}
      </span>
      <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="gc-label" htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-gold-metallic">*</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className="gc-input" />
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
//  Calendar / ICS helpers
// ---------------------------------------------------------------------------

function shiftMonth({ y, m }: { y: number; m: number }, delta: number): { y: number; m: number } {
  const total = y * 12 + m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
}

type Cell = { date: string; dayNumber: number } | null;

/** A Monday-first 6×7 grid of cells for the given month; null = padding. */
function buildMonthCells(year: number, month: number): Cell[] {
  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Sun
  const lead = (firstDow + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells: Cell[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${pad2(month + 1)}-${pad2(d)}`, dayNumber: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Google Calendar event-template URL — opens GCal pre-filled; one Save adds it. */
function buildGoogleCalendarUrl(s: SuccessState): string {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const loc = [s.venue, s.address, s.city].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Charters Gold — private appointment',
    dates: `${stamp(s.startsAt)}/${stamp(s.endsAt)}`,
    details: 'Your private valuation appointment with Charters Gold.',
    location: loc,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildIcsHref(s: SuccessState): string {
  const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const loc = [s.venue, s.address, s.city].filter(Boolean).join(', ');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Charters Gold//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${s.reference}@chartersgold.co.uk`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(s.startsAt)}`,
    `DTEND:${stamp(s.endsAt)}`,
    'SUMMARY:Charters Gold — private appointment',
    `LOCATION:${loc.replace(/,/g, '\\,')}`,
    'DESCRIPTION:Your private valuation appointment with Charters Gold.',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join('\r\n'))}`;
}

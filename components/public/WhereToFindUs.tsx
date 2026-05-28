import Link from 'next/link';
import type { EventSummary } from '@/lib/appointments/slots';

/**
 * Homepage "Where to find us" block — the travelling pop-up locations plus the
 * Egham showroom, each linking through to the booking calendar. Renders nothing
 * when there are no published upcoming events so the homepage never shows an
 * empty shell.
 */
export function WhereToFindUs({ events }: { events: EventSummary[] }) {
  if (events.length === 0) return null;

  return (
    <section className="relative py-6 lg:py-10" id="where-to-find-us">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">
            <PinIcon />
            Where To Find Us
          </span>
          <h2 className="gc-heading mt-3">Book a Private Appointment</h2>
          <p className="gc-subhead mt-3">
            We hold private valuation days at our Egham showroom and travel to pop-up locations across the
            UK. Reserve a slot and have your gold, jewellery, watches or handbags valued in person.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => {
            const full = ev.availableCount === 0;
            return (
              <Link
                key={ev.id}
                href={`/book?event=${ev.id}`}
                className="group relative flex flex-col rounded-2xl border border-gold-metallic/25 bg-ink-900/60 p-5 transition hover:-translate-y-0.5 hover:border-gold-metallic/60 hover:bg-ink-800/70 hover:shadow-[0_0_28px_-8px_rgba(243,204,15,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-white">{ev.title}</p>
                    <p className="mt-0.5 text-[13px] text-warmgrey">{ev.city} · {ev.dateRangeLabel}</p>
                  </div>
                  <span className="mt-1 text-gold-metallic transition group-hover:translate-x-0.5">
                    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7h10M8 3l4 4-4 4" /></svg>
                  </span>
                </div>

                {ev.venue_name && (
                  <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-warmgrey/80">{ev.venue_name}</p>
                )}

                <div className="mt-auto pt-4">
                  <span
                    className={
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-luxe ' +
                      (full
                        ? 'bg-ink-800 text-warmgrey/70'
                        : 'border border-gold-metallic/30 bg-ink-950/50 text-gold-bright')
                    }
                  >
                    {full ? 'Fully booked' : `${ev.availableCount} slots available`}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-7 text-center">
          <Link href="/book" className="gc-btn-primary">
            See all dates & book
          </Link>
        </div>
      </div>
    </section>
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

import Link from 'next/link';
import type { Service } from '@/types/database';

const ICONS: Record<string, React.ReactNode> = {
  bars: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="8" width="9" height="4" rx="0.6" />
      <rect x="6" y="13" width="12" height="4" rx="0.6" />
      <rect x="3" y="18" width="14" height="3.2" rx="0.6" />
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="15" r="6" />
      <path d="M9 9l3-5 3 5" />
    </svg>
  ),
  calculator: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M7 7h10M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2M15 15h2M7 19h2M11 19h2M15 19h2" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 9l8-4 8 4-8 4z" />
      <path d="M4 9v8l8 4M20 9v8l-8 4M12 13v8" />
    </svg>
  ),
  scale: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 4v16M5 8h14M5 14l-2-6h6zM21 14l-2-6h-6z" />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 9l6-5 6 5-6 11z" />
      <path d="M6 9h12M10 9l2 11M14 9l-2 11" />
    </svg>
  ),
  handbag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 9h16l-1 11a1 1 0 01-1 1H6a1 1 0 01-1-1L4 9z" />
      <path d="M8 9V6a4 4 0 018 0v3" />
    </svg>
  ),
  watch: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="6" />
      <path d="M12 9v3l2 2M9 4l1 2h4l1-2M9 20l1-2h4l1 2" />
    </svg>
  ),
};

export function ServiceCards({ services }: { services: Service[] }) {
  return (
    <section className="relative py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">Our Services</span>
          <h2 className="gc-heading mt-3">A Discreet, Professional Service</h2>
          <p className="gc-subhead mt-3">
            Every enquiry is handled by an experienced specialist. We provide transparent valuations
            and considered guidance — never pressure.
          </p>
        </div>

        {/* Compact horizontal cards in a 2-column grid. Cards are ~1/3 the
            height of the old vertical hero cards, so even an odd number of
            services (e.g. 7) splits 4|3 across the columns and stays visually
            balanced rather than leaving a glaring orphan row. */}
        {/* `grid-cols-1` is *not* the default for `grid` alone — without an
            explicit grid-template-columns the children size to their content,
            so a long description was pushing each card wider than the phone
            viewport. Forcing `minmax(0, 1fr)` columns via `grid-cols-1`
            constrains them to the available row width. */}
        <ul className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <li key={service.id}>
              <Link
                href={service.cta_href ?? '#'}
                className="group flex h-full items-center gap-4 rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-4 transition hover:border-gold-metallic hover:bg-ink-800/40"
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-gold-metallic transition group-hover:text-gold-bright"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,215,0,0.04))',
                    boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.3)',
                  }}
                >
                  <span className="h-5 w-5">
                    {(service.icon_key && ICONS[service.icon_key]) ?? ICONS.diamond}
                  </span>
                </span>
                {/* Outer wrapper is a `div`, not `<span>`, so `min-w-0` + `flex-1`
                    properly constrain the block children. A `<span>` is inline
                    by default and even as a flex item won't reliably contain
                    truncate'd children — the description was overflowing the
                    card width and getting clipped at the viewport edge. */}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate font-display text-[15px] font-semibold leading-tight text-white">
                    {service.title}
                  </div>
                  <div className="mt-1 truncate text-[12px] text-warmgrey">
                    {service.short_description}
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                  className="flex-none text-gold-metallic/70 transition group-hover:translate-x-0.5 group-hover:text-gold-bright"
                >
                  <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

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
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <span className="gc-eyebrow">Our Services</span>
            <h2 className="gc-heading mt-3">A Discreet, Professional Service</h2>
          </div>
          <p className="max-w-sm text-sm text-warmgrey">
            Every enquiry is handled by an experienced specialist. We provide transparent valuations and
            considered guidance — never pressure.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {services.map((service) => (
            <Link
              key={service.id}
              href={service.cta_href ?? '#'}
              className="gc-card gc-card-gold-edge group block overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1"
            >
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-gold-metallic group-hover:text-gold-bright"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.3)' }}
              >
                <span className="h-5 w-5">
                  {(service.icon_key && ICONS[service.icon_key]) ?? ICONS.diamond}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{service.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-warmgrey">
                {service.short_description}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint group-hover:text-gold-bright">
                {service.cta_label ?? 'Learn more'}
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

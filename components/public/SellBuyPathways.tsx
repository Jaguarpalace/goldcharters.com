import Link from 'next/link';
import type { HomepageSection } from '@/types/database';

/**
 * "Sell To Us · Buy From Us" pathways block. Content lives in the CMS
 * under section_key='sell_buy_pathways' (migration 019). The `extra`
 * JSONB column carries an array of pathways under the `pathways` key.
 *
 * Hardcoded DEFAULT_PATHWAYS provide a guaranteed fallback so the page
 * stays whole if the CMS row is missing or shape-drifted.
 */
type Pathway = {
  label: string;
  title: string;
  body: string;
  cta_label: string;
  cta_href: string;
  highlights: string[];
  variant?: 'sell' | 'buy';
};

const DEFAULT_PATHWAYS: readonly Pathway[] = [
  {
    label: '01 · Selling',
    title: 'Sell To Us',
    body: 'Receive a professional valuation for gold, diamonds, jewellery, coins and bars. Upload photos, use our gold calculator, or request a private valuation.',
    cta_label: 'Start Selling',
    cta_href: '/sell-gold',
    highlights: ['Live gold pricing', 'Same-day payment available', 'Multi-photo upload'],
    variant: 'sell',
  },
  {
    label: '02 · Buying',
    title: 'Buy From Us',
    body: 'Browse selected gold and jewellery items available to purchase online, with clear product details, photos and secure checkout.',
    cta_label: 'Shop Now',
    cta_href: '/shop',
    highlights: ['Live stock availability', 'Curated collection', 'Secure UK delivery'],
    variant: 'buy',
  },
];

/**
 * Defensive JSONB → typed read. Accepts unknown shapes from the database
 * and returns null if the row doesn't carry the expected fields, so we
 * fall back to the hardcoded defaults cleanly.
 */
function readPathways(extra: HomepageSection['extra']): Pathway[] | null {
  if (!extra || typeof extra !== 'object') return null;
  const raw = (extra as Record<string, unknown>).pathways;
  if (!Array.isArray(raw)) return null;
  const parsed = raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p): Pathway | null => {
      const label = typeof p.label === 'string' ? p.label : null;
      const title = typeof p.title === 'string' ? p.title : null;
      const body = typeof p.body === 'string' ? p.body : null;
      const ctaLabel = typeof p.cta_label === 'string' ? p.cta_label : null;
      const ctaHref = typeof p.cta_href === 'string' ? p.cta_href : null;
      const highlights = Array.isArray(p.highlights)
        ? p.highlights.filter((h): h is string => typeof h === 'string')
        : [];
      const variant = p.variant === 'buy' ? 'buy' : 'sell';
      if (!label || !title || !body || !ctaLabel || !ctaHref) return null;
      return {
        label,
        title,
        body,
        cta_label: ctaLabel,
        cta_href: ctaHref,
        highlights,
        variant,
      };
    })
    .filter((p): p is Pathway => p !== null);
  return parsed.length > 0 ? parsed : null;
}

export function SellBuyPathways({ section }: { section?: HomepageSection }) {
  const eyebrow = section?.subtitle ?? 'Two Distinct Journeys';
  const title = section?.title ?? 'Sell To Us · Buy From Us';
  const subhead =
    section?.body ??
    'Our private clients choose one of two pathways. Both are handled with the same level of care and discretion.';
  const pathways = (section ? readPathways(section.extra) : null) ?? [...DEFAULT_PATHWAYS];

  return (
    <section className="relative border-b border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">{eyebrow}</span>
          <h2 className="gc-heading mt-4">{title}</h2>
          <p className="gc-subhead mt-4">{subhead}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
          {pathways.map((p) => (
            <PathwayCard
              key={p.title}
              label={p.label}
              title={p.title}
              body={p.body}
              cta={{ label: p.cta_label, href: p.cta_href }}
              highlights={p.highlights}
              variant={p.variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

type PathwayCardProps = {
  label: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  highlights: string[];
  variant?: 'sell' | 'buy';
};

function PathwayCard({ label, title, body, cta, highlights, variant = 'sell' }: PathwayCardProps) {
  return (
    <article className="gc-card gc-card-gold-edge group relative overflow-hidden p-8 sm:p-10">
      <div
        aria-hidden
        className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            variant === 'buy'
              ? 'radial-gradient(circle, rgba(255,215,0,0.4), transparent 70%)'
              : 'radial-gradient(circle, rgba(212,175,55,0.4), transparent 70%)',
        }}
      />
      <span className="gc-eyebrow">{label}</span>
      <h3 className="font-display text-3xl text-white mt-3 sm:text-4xl">{title}</h3>
      <p className="mt-4 max-w-md text-warmgrey">{body}</p>

      <ul className="mt-7 space-y-2.5 text-sm text-warmgrey">
        {highlights.map((h) => (
          <li key={h} className="flex items-start gap-2.5">
            <CheckIcon />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <div className="mt-9">
        <Link
          href={cta.href}
          className={variant === 'buy' ? 'gc-btn-primary' : 'gc-btn-secondary'}
        >
          {cta.label}
        </Link>
      </div>
    </article>
  );
}

function CheckIcon() {
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full"
      style={{
        background: 'linear-gradient(135deg, #FFD700, #B8860B)',
        boxShadow: '0 0 8px rgba(212,175,55,0.5)',
      }}
    >
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#050505" strokeWidth="2">
        <path d="M2 6.5L5 9.5L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

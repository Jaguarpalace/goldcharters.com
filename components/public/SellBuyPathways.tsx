import Link from 'next/link';

export function SellBuyPathways() {
  return (
    <section className="relative border-b border-gold-metallic/15 py-6 lg:py-10">
      <div className="gc-container">
        <div className="mx-auto max-w-3xl text-center">
          <span className="gc-eyebrow">Two Distinct Journeys</span>
          <h2 className="gc-heading mt-4">Sell To Us · Buy From Us</h2>
          <p className="gc-subhead mt-4">
            Our private clients choose one of two pathways. Both are handled with the same level of care and
            discretion.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
          <PathwayCard
            label="01 · Selling"
            title="Sell To Us"
            body="Receive a professional valuation for gold, diamonds, jewellery, coins and bars. Upload photos, use our gold calculator, or request a private valuation."
            cta={{ label: 'Start Selling', href: '/sell-gold' }}
            highlights={['Live gold pricing', 'Same-day payment available', 'Multi-photo upload']}
          />
          <PathwayCard
            label="02 · Buying"
            title="Buy From Us"
            body="Browse selected gold and jewellery items available to purchase online, with clear product details, photos and secure checkout."
            cta={{ label: 'Shop Now', href: '/shop' }}
            highlights={['Live stock availability', 'Curated collection', 'Secure UK delivery']}
            variant="buy"
          />
        </div>
      </div>
    </section>
  );
}

type Pathway = {
  label: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  highlights: string[];
  variant?: 'sell' | 'buy';
};

function PathwayCard({ label, title, body, cta, highlights, variant = 'sell' }: Pathway) {
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

import Image from 'next/image';
import Link from 'next/link';
import type { HomepageSection } from '@/types/database';

type Extra = { bullets?: string[] };

export function SellSection({
  section,
  variant,
  asH1 = false,
}: {
  section: HomepageSection | undefined;
  variant: 'gold' | 'jewellery';
  /** When this section is the top-of-page hero, render the title as <h1> for SEO. */
  asH1?: boolean;
}) {
  if (!section) return null;
  const extra = (section.extra ?? {}) as Extra;
  const bullets = extra.bullets ?? [];
  const flip = variant === 'jewellery';
  const HeadingTag = asH1 ? 'h1' : 'h2';
  const headingClass = asH1 ? 'gc-heading-xl mt-4' : 'gc-heading mt-3';

  // When this section is the page's hero (asH1), the visitor is already on
  // the dedicated page — the CTA should scroll to the in-page valuation form,
  // not re-route to the same URL. On the homepage (asH1=false), use the
  // section's CTA as-is so it routes to /sell-gold, /sell-handbags etc.
  const ctaHref = asH1 ? '#valuation-form' : section.cta_href;

  return (
    <section
      className={`relative border-b border-gold-metallic/15 ${
        asH1 ? 'pt-2 pb-6 lg:py-10' : 'py-6 lg:py-10'
      }`}
    >
      <div className="gc-container">
        <div className={`grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-10 lg:gap-14 ${flip ? 'md:[&>*:first-child]:order-2' : ''}`}>
          <div>
            <span className="gc-eyebrow">{variant === 'gold' ? 'Sell Gold' : 'Sell Jewellery'}</span>
            <HeadingTag className={headingClass}>{section.title}</HeadingTag>
            {section.subtitle && (
              <p className="mt-3 text-sm uppercase tracking-luxe text-gold-tint">
                {section.subtitle}
              </p>
            )}
            <p className="gc-subhead mt-4 max-w-xl sm:mt-5">{section.body}</p>
            <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:mt-7 sm:grid-cols-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-warmgrey">
                  <Bullet />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {section.cta_label && ctaHref && (
              <div className="mt-6 sm:mt-9">
                {/*
                 * Same-page hash links go via a plain <a> so the browser handles
                 * the smooth scroll natively. Next.js <Link> doesn't reliably
                 * scroll to hash anchors when the route is the current page.
                 */}
                {ctaHref.startsWith('#') ? (
                  <a href={ctaHref} className="gc-btn-primary">
                    {section.cta_label}
                  </a>
                ) : (
                  <Link href={ctaHref} className="gc-btn-primary">
                    {section.cta_label}
                  </Link>
                )}
              </div>
            )}
          </div>

          {section.image_url ? (
            <SellImage url={section.image_url} alt={section.title ?? ''} />
          ) : (
            <DecorativePanel variant={variant} />
          )}
        </div>
      </div>
    </section>
  );
}

function Bullet() {
  return (
    <span
      aria-hidden
      className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full"
      style={{
        background: 'linear-gradient(135deg, #FFD700, #B8860B)',
        boxShadow: '0 0 6px rgba(212,175,55,0.6)',
      }}
    />
  );
}

/** Renders the admin-uploaded section image. Sizing matches the hero image
 *  so every section across the site uses the same card proportions. */
function SellImage({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="relative aspect-[6/5] overflow-hidden rounded-3xl sm:aspect-square"
        style={{
          boxShadow: '0 30px 90px -40px rgba(212,175,55,0.4), inset 0 0 0 1px rgba(212,175,55,0.25)',
        }}
      >
        <Image
          src={url}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 440px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

function DecorativePanel({ variant }: { variant: 'gold' | 'jewellery' }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
    <div
      className="relative aspect-[6/5] overflow-hidden rounded-3xl sm:aspect-square"
      style={{
        background: 'linear-gradient(160deg, #0b0b0b, #141414 50%, #050505)',
        boxShadow: '0 30px 90px -40px rgba(212,175,55,0.4), inset 0 0 0 1px rgba(212,175,55,0.25)',
      }}
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 30%, rgba(255,215,0,0.18), transparent 70%)',
        }}
      />
      {variant === 'gold' ? (
        <>
          <div className="absolute left-10 top-12 h-20 w-40 rotate-[-6deg] rounded-md bg-gradient-to-br from-gold-bright via-gold-metallic to-gold-deep shadow-[0_0_30px_rgba(212,175,55,0.5)]" />
          <div className="absolute left-24 top-32 h-16 w-32 rotate-[5deg] rounded-md bg-gradient-to-br from-gold-tint via-gold-metallic to-gold-antique shadow-[0_0_24px_rgba(212,175,55,0.4)]" />
          <div className="absolute right-12 bottom-14 h-24 w-24 rounded-full border-[6px] border-gold-metallic/70 shadow-[0_0_24px_rgba(212,175,55,0.4)]" />
        </>
      ) : (
        <>
          <div
            className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'conic-gradient(from 200deg, #A67C00, #D4AF37, #FFD700, #D4AF37, #B8860B, #A67C00)',
              mask: 'radial-gradient(circle, transparent 47%, #000 49%, #000 51%, transparent 53%)',
              WebkitMask:
                'radial-gradient(circle, transparent 47%, #000 49%, #000 51%, transparent 53%)',
            }}
          />
          <div className="absolute left-1/2 top-[42%] h-3 w-3 -translate-x-1/2 rotate-45 bg-white shadow-[0_0_18px_rgba(255,255,255,0.7)]" />
          <div className="absolute right-10 top-10 h-20 w-20 rounded-2xl border border-gold-metallic/40 bg-ink-900/60" />
          <div className="absolute left-10 bottom-10 h-20 w-20 rounded-2xl border border-gold-metallic/40 bg-ink-900/60" />
        </>
      )}
    </div>
    </div>
  );
}

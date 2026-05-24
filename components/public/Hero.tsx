import Image from 'next/image';
import Link from 'next/link';
import type { HomepageSection } from '@/types/database';
import { BUY_ENABLED } from '@/lib/features';

type HeroExtra = {
  secondary_cta_label?: string;
  secondary_cta_href?: string;
  badges?: string[];
};

export function Hero({ section }: { section?: HomepageSection }) {
  const extra = (section?.extra ?? {}) as HeroExtra;
  const badges = extra.badges ?? [];
  const imageUrl = section?.image_url ?? null;

  // If the CMS still has a "Shop ..." secondary CTA but the shop is disabled,
  // suppress it. Also hides any future shop-pointing CTA the admin might set.
  const secondaryHrefRaw = extra.secondary_cta_href;
  const secondaryHidden =
    !BUY_ENABLED &&
    typeof secondaryHrefRaw === 'string' &&
    (secondaryHrefRaw.startsWith('/shop') ||
      secondaryHrefRaw.startsWith('/basket') ||
      secondaryHrefRaw.startsWith('/checkout'));
  const showSecondary =
    !secondaryHidden && extra.secondary_cta_label && extra.secondary_cta_href;

  return (
    <section className="relative overflow-hidden border-b border-gold-metallic/15">
      <HeroBackdrop />
      <div className="gc-container relative grid grid-cols-1 gap-10 py-10 md:grid-cols-2 md:items-center md:gap-12 md:py-12 lg:gap-14 lg:py-14">
        <div className="gc-reveal max-w-2xl">
          <span className="gc-eyebrow">
            <span className="h-px w-8 bg-gold-metallic" /> Private UK Specialists
          </span>
          <h1 className="gc-heading-xl mt-5">
            {section?.title ?? 'Unlock the Value of Gold & Jewellery'}
          </h1>
          <p className="gc-subhead mt-6 max-w-xl">{section?.subtitle}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={section?.cta_href ?? '/sell-gold'} className="gc-btn-primary">
              {section?.cta_label ?? 'Sell Gold & Jewellery'}
            </Link>
            {showSecondary && (
              <Link href={extra.secondary_cta_href!} className="gc-btn-secondary">
                {extra.secondary_cta_label}
              </Link>
            )}
          </div>

          {badges.length > 0 && (
            <ul className="mt-10 grid grid-cols-1 gap-2 text-sm text-warmgrey sm:grid-cols-2">
              {badges.map((badge) => (
                <li key={badge} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2 w-2 rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, #FFD700, #B8860B)',
                      boxShadow: '0 0 8px rgba(212,175,55,0.7)',
                    }}
                  />
                  <span>{badge}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {imageUrl ? <HeroImage url={imageUrl} alt={section?.title ?? ''} /> : <HeroVisual />}
      </div>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 75% 20%, rgba(212,175,55,0.18), transparent 60%), radial-gradient(50% 50% at 15% 80%, rgba(255,215,0,0.10), transparent 60%), linear-gradient(180deg, #050505, #0b0b0b 60%, #050505)',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), rgba(255,215,0,0.9), rgba(212,175,55,0.6), transparent)',
        }}
      />
    </div>
  );
}

/**
 * Renders the admin-uploaded hero image with a thin gold border + soft glow
 * so it still feels luxurious instead of "bare photo on dark bg".
 */
function HeroImage({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-3xl"
        style={{
          boxShadow: '0 30px 90px -30px rgba(212,175,55,0.45), inset 0 0 0 1px rgba(212,175,55,0.25)',
        }}
      >
        <Image
          src={url}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 440px"
          className="object-cover"
        />
      </div>
    </div>
  );
}

/**
 * Fallback CSS art shown only when no image_url is set on the hero section.
 * Keeps the homepage looking finished out-of-the-box.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-3xl"
        style={{
          background:
            'radial-gradient(60% 40% at 50% 30%, rgba(255,215,0,0.18), transparent 70%), linear-gradient(160deg, #0b0b0b, #050505 60%, #141414)',
          boxShadow: '0 30px 90px -30px rgba(212,175,55,0.45), inset 0 0 0 1px rgba(212,175,55,0.25)',
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'conic-gradient(from 200deg, #A67C00, #D4AF37, #FFD700, #D4AF37, #B8860B, #A67C00)',
            mask: 'radial-gradient(circle at center, transparent 47%, #000 49%, #000 51%, transparent 53%)',
            WebkitMask:
              'radial-gradient(circle at center, transparent 47%, #000 49%, #000 51%, transparent 53%)',
            filter: 'blur(0.4px)',
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-white shadow-[0_0_24px_8px_rgba(255,255,255,0.7)]" />
        <div className="absolute bottom-10 left-10 h-16 w-32 rotate-[-8deg] rounded-md bg-gradient-to-br from-gold-bright via-gold-metallic to-gold-deep shadow-[0_0_30px_rgba(212,175,55,0.5)]" />
        <div className="absolute bottom-20 left-24 h-14 w-28 rotate-[6deg] rounded-md bg-gradient-to-br from-gold-tint via-gold-metallic to-gold-antique shadow-[0_0_24px_rgba(212,175,55,0.4)]" />
        <div className="absolute right-6 top-8 h-32 w-32 rounded-2xl border border-gold-metallic/30 bg-ink-900/60 backdrop-blur-sm">
          <div className="m-3 h-[calc(100%-1.5rem)] rounded-xl border border-gold-metallic/20 bg-gradient-to-br from-ink-800 to-ink-950" />
        </div>
        <div className="absolute inset-x-6 bottom-6 flex items-center justify-between rounded-2xl border border-gold-metallic/20 bg-ink-950/70 px-4 py-3 backdrop-blur-md">
          <div>
            <div className="text-[10px] uppercase tracking-luxe text-gold-tint">Private Valuation</div>
            <div className="font-display text-lg text-white">Egham · Surrey</div>
          </div>
          <span className="gc-pill">By appointment</span>
        </div>
      </div>
    </div>
  );
}

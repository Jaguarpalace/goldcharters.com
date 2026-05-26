import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  businessName: string;
  /**
   * `default` — large variant for the hero and login (240 px on lg).
   * `footer`  — mid-size variant for the footer (192 px on lg).
   * `compact` — small variant for the sticky header (112 px on lg).
   */
  size?: 'default' | 'footer' | 'compact';
  /** Where clicking the logo navigates. Defaults to `/` (the public homepage). */
  href?: string;
};

/**
 * Brand mark. The tagline "Precious Metal Traders" always sits directly below
 * the crest — same layout at every size, just the image scales.
 *
 * Uses the PNG file (true alpha) rather than the WebP — no `mix-blend-mode`
 * hack is needed because the PNG has genuine transparency, so the crest looks
 * sharp on both dark and light surfaces.
 */
export function Logo({ businessName, size = 'default', href = '/' }: LogoProps) {
  const compact = size === 'compact';
  const footer = size === 'footer';

  const imageClass =
    compact
      ? // Header: 70 / 94 / 100 px — sized to sit unobtrusively in the
        // sticky nav while keeping the crest legible.
        'h-[70px] w-[70px] object-contain sm:h-[94px] sm:w-[94px] lg:h-[100px] lg:w-[100px]'
      : footer
      ? // Footer: 100 / 140 / 160 px — clearly larger than the header
        // crest, smaller than the hero brand statement.
        'h-[100px] w-[100px] object-contain sm:h-[140px] sm:w-[140px] lg:h-40 lg:w-40'
      : // Hero / login (default): full-size brand statement.
        'h-[168px] w-[168px] object-contain transition-transform duration-300 group-hover:scale-105 sm:h-48 sm:w-48 lg:h-60 lg:w-60';

  const sizesAttr = compact
    ? '(max-width: 640px) 70px, 100px'
    : footer
    ? '(max-width: 640px) 100px, (max-width: 1024px) 140px, 160px'
    : '(max-width: 640px) 168px, (max-width: 1024px) 192px, 240px';

  return (
    <Link
      href={href}
      className="group inline-flex flex-col items-center leading-none"
      aria-label={`${businessName} — home`}
    >
      <Image
        src="/logo/charters_gold_true_transparent.png"
        alt={businessName}
        width={520}
        height={520}
        priority
        sizes={sizesAttr}
        className={imageClass}
      />
      {/*
        The logo image already has "Charters Gold" baked into the artwork,
        so we only render the "Precious Metal Traders" tagline on the
        larger (default) variant — login page, footer, hero contexts where
        the extra line has space to breathe. In the header (compact) it
        would either stack on top of the baked-in name or overflow the
        header divider, so we leave it out.
      */}
      {!compact && (
        <span
          className="mt-2 text-[9px] font-semibold uppercase tracking-luxe gc-text-gold-gradient sm:text-[10px]"
          style={{ letterSpacing: '0.22em' }}
        >
          Precious Metal Traders
        </span>
      )}
    </Link>
  );
}

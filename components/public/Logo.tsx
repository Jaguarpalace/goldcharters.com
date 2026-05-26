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
      ? // Header: 80 / 96 / 112 px — 20% smaller than the previous compact
        // so it sits comfortably in a slimmer sticky header.
        'h-20 w-20 object-contain sm:h-24 sm:w-24 lg:h-28 lg:w-28'
      : footer
      ? // Footer: 128 / 160 / 192 px — 20% smaller than the hero/login.
        'h-32 w-32 object-contain sm:h-40 sm:w-40 lg:h-48 lg:w-48'
      : // Hero / login (default): full-size brand statement.
        'h-[168px] w-[168px] object-contain transition-transform duration-300 group-hover:scale-105 sm:h-48 sm:w-48 lg:h-60 lg:w-60';

  const sizesAttr = compact
    ? '(max-width: 640px) 80px, 112px'
    : footer
    ? '(max-width: 640px) 128px, (max-width: 1024px) 160px, 192px'
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

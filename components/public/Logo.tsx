import Image from 'next/image';
import Link from 'next/link';

type LogoProps = {
  businessName: string;
  /** `default` for hero / login (large); `compact` for header / footer (smaller). */
  size?: 'default' | 'compact';
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
        sizes={
          compact
            ? '(max-width: 640px) 96px, 132px'
            : '(max-width: 640px) 168px, (max-width: 1024px) 192px, 240px'
        }
        className={
          compact
            ? 'h-24 w-24 object-contain sm:h-[120px] sm:w-[120px] lg:h-[132px] lg:w-[132px]'
            : 'h-[168px] w-[168px] object-contain transition-transform duration-300 group-hover:scale-105 sm:h-48 sm:w-48 lg:h-60 lg:w-60'
        }
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

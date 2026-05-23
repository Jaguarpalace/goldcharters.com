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
        src="/logo/charters-gold.webp"
        alt={businessName}
        width={520}
        height={520}
        priority
        sizes={
          compact
            ? '(max-width: 640px) 48px, 64px'
            : '(max-width: 640px) 96px, (max-width: 1024px) 120px, 144px'
        }
        // mix-blend-mode: lighten makes the logo's baked-in dark background
        // blend with the site's black surfaces — visual transparency without
        // requiring the file itself to have an alpha channel.
        style={{ mixBlendMode: 'lighten' }}
        className={
          compact
            ? 'h-12 w-12 object-contain sm:h-14 sm:w-14 lg:h-16 lg:w-16'
            : 'h-20 w-20 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24 lg:h-28 lg:w-28'
        }
      />
      <span
        className={
          compact
            ? 'mt-1 text-[8px] font-semibold uppercase gc-text-gold-gradient sm:text-[9px]'
            : 'mt-1.5 text-[9px] font-semibold uppercase tracking-luxe gc-text-gold-gradient sm:text-[10px]'
        }
        style={{ letterSpacing: '0.22em' }}
      >
        Precious Metal Traders
      </span>
    </Link>
  );
}

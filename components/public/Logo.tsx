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
            ? '(max-width: 640px) 64px, 88px'
            : '(max-width: 640px) 128px, (max-width: 1024px) 160px, 192px'
        }
        className={
          compact
            ? 'h-16 w-16 object-contain sm:h-20 sm:w-20 lg:h-[88px] lg:w-[88px]'
            : 'h-28 w-28 object-contain transition-transform duration-300 group-hover:scale-105 sm:h-32 sm:w-32 lg:h-40 lg:w-40'
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

import Image from 'next/image';
import Link from 'next/link';

/**
 * Brand block for the admin sidebar. Mirrors the public Logo's structure
 * (crest + "Precious Metal Traders" tagline) but renders the PNG variant
 * with no `mix-blend-mode`, so it stays sharp on both the dark theme and
 * the light theme. Always centered.
 */
export function AdminBrand() {
  return (
    <Link
      href="/admin"
      aria-label="Charters Gold - admin home"
      className="group flex flex-col items-center leading-none"
    >
      <Image
        src="/logo/charters_gold_true_transparent.png"
        alt="Charters Gold"
        width={320}
        height={320}
        priority
        sizes="128px"
        className="h-28 w-28 object-contain transition-transform duration-300 group-hover:scale-105"
      />
      <span
        className="mt-1.5 text-[9px] font-semibold uppercase tracking-luxe gc-text-gold-gradient sm:text-[10px]"
        style={{ letterSpacing: '0.22em' }}
      >
        Precious Metal Traders
      </span>
    </Link>
  );
}

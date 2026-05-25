'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Single sidebar entry. Reads the current path and highlights itself when
 * it matches, so the admin always knows where they are. Lives in the
 * client layer because the parent dashboard layout is server-rendered.
 */
export function NavLink({
  href,
  label,
  inactive = false,
  inactiveTitle,
  badge,
}: {
  href: string;
  label: string;
  /** True when the feature is paused (e.g. shop disabled). Greys out the row. */
  inactive?: boolean;
  inactiveTitle?: string;
  /** Optional right-aligned chip — e.g. outstanding count for valuation requests. */
  badge?: React.ReactNode;
}) {
  const pathname = usePathname();
  // "/admin" matches only the dashboard root; every other entry also matches
  // its own subroutes (e.g. "/admin/customers/abc" highlights "Customers").
  const active =
    pathname === href || (href !== '/admin' && pathname?.startsWith(href + '/'));

  const base = 'flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition';

  let theme: string;
  if (inactive) {
    theme = 'text-warmgrey/40 hover:bg-ink-800 hover:text-warmgrey/70';
  } else if (active) {
    // Active state — solid gold outline + bright text + soft glow so the
    // current section is unmistakable on both desktop and the mobile drawer.
    theme =
      'border border-gold-metallic/40 bg-gold-metallic/10 text-gold-bright shadow-[0_0_12px_-2px_rgba(212,175,55,0.35)]';
  } else {
    theme = 'text-white/85 hover:bg-ink-800 hover:text-gold-bright';
  }

  return (
    <Link href={href} title={inactive ? inactiveTitle : undefined} className={`${base} ${theme}`}>
      <span>{label}</span>
      {inactive && (
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-luxe text-amber-300">
          Off
        </span>
      )}
      {badge}
    </Link>
  );
}

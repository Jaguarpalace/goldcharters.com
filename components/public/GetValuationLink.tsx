'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The "Get a Valuation" / "Open the form" link.
 *
 * Behaviour (per Rishi's brief):
 *   - Always lands the customer on the METAL form by default.
 *   - If they're already on a page that renders the metal variant
 *     (homepage, /sell-gold, /sell-silver), smooth-scroll instead of
 *     navigating to avoid a wasted page load.
 *   - Anywhere else — including /sell-jewellery, /sell-watches and
 *     /sell-handbags which render their own contextual forms — navigate
 *     to /sell-gold so the user lands on the metal form, not the
 *     contextual one. That's what this button represents.
 */
export function GetValuationLink({
  className,
  children,
  onNavigate,
}: {
  className?: string;
  children: ReactNode;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const target = '/sell-gold#valuation-form';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();

    const onMetalPage =
      pathname === '/' || pathname === '/sell-gold' || pathname === '/sell-silver';
    if (onMetalPage && typeof document !== 'undefined' && document.getElementById('valuation-form')) {
      e.preventDefault();
      window.history.replaceState(null, '', `${pathname}#valuation-form`);
      document.getElementById('valuation-form')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    e.preventDefault();
    router.push(target);
  };

  return (
    <a href={target} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The "Get a Valuation" / "Open the form" link.
 *
 * Behaviour (per Rishi's brief):
 *   - If the page the customer is on has a valuation form (every sell-*
 *     page, every location page, the calculator, the homepage), smooth-
 *     scroll to it. A watch seller on /sell-watches gets the watch form,
 *     a Reading seller stays on the Reading page. (Changed 16 Sep 2026:
 *     the old behaviour sent everyone to the metal form on /sell-gold.)
 *   - Pages without a form (blog, legal, contact) navigate to /sell-gold.
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

    if (typeof document !== 'undefined' && document.getElementById('valuation-form')) {
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

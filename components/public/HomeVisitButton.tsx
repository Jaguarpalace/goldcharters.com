'use client';

import { track } from '@/lib/analytics/track';

/**
 * "We come to you" call to action for location pages where another buyer is
 * nearer than our Ascot office (the page sets `homeVisit`).
 *
 * It does not book a slot. It switches the valuation form on the same page
 * into home-visit mode (postcode + days that suit) and scrolls to it, so
 * every visit is a request we can qualify by phone before anyone drives.
 */
export function HomeVisitButton({
  where,
  className,
  children,
}: {
  /** Which button was pressed, for the click report: hero, strip, section, card. */
  where: string;
  className?: string;
  children: React.ReactNode;
}) {
  const onClick = () => {
    track('cta_click', { where: `home-visit-${where}`, page: window.location.pathname });
    window.dispatchEvent(new CustomEvent('gc:home-visit'));
    document.getElementById('valuation-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

'use client';

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { track, type TrackEvent } from '@/lib/analytics/track';

/**
 * A plain <a> that reports a click to the Google tag (when loaded) before
 * following the link. Used for the phone number and WhatsApp links, which
 * leave the site and would otherwise be invisible as conversions.
 */
export function TrackedLink({
  event,
  params,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: TrackEvent;
  params?: Record<string, string | number | boolean | null | undefined>;
  children: ReactNode;
}) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, { page: typeof window !== 'undefined' ? window.location.pathname : undefined, ...params });
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

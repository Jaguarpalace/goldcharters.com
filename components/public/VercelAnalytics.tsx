'use client';

import { Analytics } from '@vercel/analytics/next';
import { isInternalDevice } from '@/lib/analytics/internal';

/**
 * Vercel Analytics with two filters: nothing from /admin paths, and nothing
 * from a device that has opened the admin (see lib/analytics/internal.ts).
 */
export function VercelAnalytics() {
  return (
    <Analytics
      beforeSend={(event) => {
        if (event.url.includes('/admin')) return null;
        if (isInternalDevice()) return null;
        return event;
      }}
    />
  );
}

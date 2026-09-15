'use client';

/**
 * Staff-device opt-out for every analytics tool on the site.
 *
 * Opening the admin on a device marks that browser as internal. From then
 * on its visits to the public pages are dropped by Vercel Analytics and the
 * Google tag never loads for it, so the numbers Paul and Rishi read are
 * customers only. Clearing site data resets the flag.
 */

const FLAG = 'gc-internal';
/** Vercel Analytics' own documented opt-out key; kept in step with ours. */
const VERCEL_FLAG = 'va-disable';

export function markInternalDevice(): void {
  try {
    window.localStorage.setItem(FLAG, '1');
    window.localStorage.setItem(VERCEL_FLAG, '1');
  } catch {
    /* storage blocked */
  }
}

export function isInternalDevice(): boolean {
  try {
    return window.localStorage.getItem(FLAG) === '1' || window.localStorage.getItem(VERCEL_FLAG) === '1';
  } catch {
    return false;
  }
}

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Makes cross-page anchor links actually land on the anchor.
 *
 * The app router navigates client-side, and when it does two things go wrong.
 * The target element is often not in the DOM yet at the moment the router
 * would scroll, and the router then scrolls the new page to the top anyway.
 * The result was a URL reading /sell-gold#valuation-form on a page still
 * sitting at the top, which is what every hero and header "start your
 * valuation" button did.
 *
 * Scrolling once loses that race about half the time, so instead we hold the
 * position: find the element, jump to it, then keep re-asserting for a beat
 * until it stays put. Jumping rather than smooth-scrolling avoids fighting an
 * animation the router can cancel, and matches what a normal anchor load does.
 *
 * Scroll margin is already set in globals.css, so the sticky header does not
 * cover the target.
 */

const FIND_TIMEOUT_MS = 2000;
const HOLD_TIMEOUT_MS = 1200;
const CHECK_EVERY_MS = 80;
/** Close enough to the scroll-margin offset to call it landed. */
const TOLERANCE_PX = 160;

export function ScrollToHash() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;

    const id = window.location.hash.slice(1);
    if (!id) return;

    let cancelled = false;
    let timer = 0;
    const findDeadline = Date.now() + FIND_TIMEOUT_MS;
    let holdDeadline = 0;
    let settled = 0;

    const tick = () => {
      if (cancelled) return;

      const el = document.getElementById(id);
      if (!el) {
        if (Date.now() < findDeadline) timer = window.setTimeout(tick, CHECK_EVERY_MS);
        return;
      }

      // First sighting starts the hold window.
      if (!holdDeadline) holdDeadline = Date.now() + HOLD_TIMEOUT_MS;

      const top = el.getBoundingClientRect().top;
      if (Math.abs(top) > TOLERANCE_PX) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        settled = 0;
      } else {
        settled += 1;
      }

      // Two clean checks in a row means the router has stopped moving us.
      if (settled < 2 && Date.now() < holdDeadline) {
        timer = window.setTimeout(tick, CHECK_EVERY_MS);
      }
    };

    timer = window.setTimeout(tick, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}

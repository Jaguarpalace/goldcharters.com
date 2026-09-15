'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { onConsentChange, readConsent } from '@/lib/consent/consent';
import { captureAttribution } from '@/lib/attribution/attribution';
import { isInternalDevice } from '@/lib/analytics/internal';

/**
 * Google tag (GA4, optionally Google Ads), loaded only with consent.
 *
 *   - Nothing loads until the visitor has accepted the analytics category in
 *     the cookie banner. Reject all = the script is never fetched.
 *   - Consent Mode defaults are set to "denied" before the tag loads and
 *     updated when the visitor decides, so Google's own behaviour matches.
 *   - Never runs on /admin paths, so staff visits stay out of the numbers.
 *   - Sends a page_view on client-side navigations (the app router does not
 *     reload the page), which GA4 needs for accurate landing-page reports.
 *   - Also captures first-party attribution (no consent needed) on every
 *     page load, so enquiries can be attributed even when the tag is off.
 *
 * Configured from /admin/analytics via site settings; renders nothing when
 * no measurement id is set.
 */
export function GoogleTag({ gaId, adsId, adsLabel }: { gaId: string | null; adsId: string | null; adsLabel: string | null }) {
  const pathname = usePathname();
  const loaded = useRef(false);
  const isAdmin = pathname?.startsWith('/admin');

  // First-party attribution, every page, no consent needed.
  useEffect(() => {
    if (!isAdmin) captureAttribution();
  }, [pathname, isAdmin]);

  useEffect(() => {
    if (!gaId || isAdmin || isInternalDevice()) return;

    const load = () => {
      if (loaded.current) return;
      loaded.current = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
      window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
      document.head.appendChild(s);
      window.gtag('js', new Date());
      window.gtag('config', gaId, { anonymize_ip: true, send_page_view: true });
      if (adsId) {
        window.gtag('config', adsId);
        window.__gcAds = adsLabel ? { id: adsId, label: adsLabel } : null;
      }
    };

    const apply = (analytics: boolean, marketing: boolean) => {
      if (!analytics) return; // no consent: nothing loads, nothing is sent
      load();
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: marketing ? 'granted' : 'denied',
        ad_user_data: marketing ? 'granted' : 'denied',
        ad_personalization: marketing ? 'granted' : 'denied',
      });
    };

    const existing = readConsent();
    if (existing) apply(existing.analytics, existing.marketing);
    return onConsentChange((d) => apply(d.analytics, d.marketing));
  }, [gaId, adsId, adsLabel, isAdmin]);

  // Client-side navigations: one page_view per route change after the first.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!isAdmin && loaded.current && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname, isAdmin]);

  return null;
}

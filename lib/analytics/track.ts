'use client';

/**
 * Thin wrapper around the Google tag. Safe to call anywhere: if the tag is
 * not loaded (no consent, no measurement id, admin pages) it does nothing.
 *
 * Event names follow GA4's recommended set where one exists
 * (generate_lead) and plain snake_case otherwise.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __gcAds?: { id: string; label: string } | null;
  }
}

export type TrackEvent =
  | 'generate_lead'
  | 'book_appointment'
  | 'phone_click'
  | 'whatsapp_click'
  | 'calculator_request_click'
  /** Sticky bottom bar: intent to start, not a conversion. */
  | 'cta_click';

export function track(name: TrackEvent, params: Record<string, string | number | boolean | null | undefined> = {}): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined) clean[k] = v;
  try {
    window.gtag('event', name, clean);
    // Google Ads conversion for the two events that mean a real enquiry.
    const ads = window.__gcAds;
    if (ads && (name === 'generate_lead' || name === 'book_appointment')) {
      window.gtag('event', 'conversion', { send_to: `${ads.id}/${ads.label}` });
    }
  } catch {
    /* never let analytics break the page */
  }
}

'use client';

import type { AttributionFields } from './classify';

/**
 * Client-side attribution capture.
 *
 * On the first page of a visit we remember the landing page, the referrer
 * and any UTM / gclid parameters in sessionStorage (cleared when the tab
 * closes - nothing persistent, nothing that identifies the person). When a
 * form is submitted, `getAttribution()` returns those values plus the page
 * the form was on, and the server stores them with the enquiry.
 *
 * No consent is needed for this: it is first-party, session-only, and
 * exists to answer "which page produced this enquiry", which is a
 * legitimate interest of the business. The Google tag, which does need
 * consent, is handled separately in components/public/GoogleTag.tsx.
 */

const KEY = 'gc-attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term'] as const;

type Stored = {
  landing_page: string;
  referrer: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  gclid?: string;
};

function read(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/** Call once per page load. Records the first page of the visit and any
 *  campaign parameters; later page views do not overwrite it, except that a
 *  fresh gclid/UTM on a later page (a new ad click mid-session) replaces it. */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming: Partial<Stored> = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) incoming[k] = v.slice(0, 120);
    }
    const gclid = params.get('gclid');
    if (gclid) incoming.gclid = gclid.slice(0, 200);
    const existing = read();
    const hasCampaign = Object.keys(incoming).length > 0;
    if (existing && !hasCampaign) return;
    const next: Stored = {
      landing_page: existing?.landing_page ?? window.location.pathname.slice(0, 300),
      referrer: existing?.referrer ?? document.referrer.slice(0, 500),
      ...(existing ?? {}),
      ...incoming,
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: attribution simply stays empty */
  }
}

/** Everything the server should store with an enquiry sent from this page. */
export function getAttribution(): AttributionFields {
  if (typeof window === 'undefined') return {};
  const s = read();
  return {
    landing_page: s?.landing_page ?? window.location.pathname.slice(0, 300),
    source_page: window.location.pathname.slice(0, 300),
    referrer: s?.referrer ?? document.referrer.slice(0, 500) ?? '',
    utm_source: s?.utm_source ?? null,
    utm_medium: s?.utm_medium ?? null,
    utm_campaign: s?.utm_campaign ?? null,
    utm_term: s?.utm_term ?? null,
    gclid: s?.gclid ?? null,
  };
}

/** Append the attribution fields to a FormData as attr_* entries. */
export function appendAttribution(fd: FormData): void {
  const a = getAttribution();
  for (const [k, v] of Object.entries(a)) {
    if (v) fd.set('attr_' + k, String(v));
  }
}

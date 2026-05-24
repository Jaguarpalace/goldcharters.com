'use client';

/**
 * Cookie-based consent store.
 *
 * Compliance notes (UK GDPR + PECR + ICO 2023 guidance):
 *   - "Necessary" cookies are always on and require no consent (auth,
 *     basket, session). They're disclosed for transparency.
 *   - "Analytics" and "Marketing" default to OFF until the user opts in.
 *   - Reject all must be as prominent as Accept all.
 *   - We re-prompt after 180 days; ICO allows up to ~12 months but a
 *     shorter window is the safer side of the line.
 *   - Consent fires a `consent-change` event so analytics scripts can
 *     opt-in/out dynamically without a page reload.
 */

export type ConsentDecision = {
  necessary: true; // immutable
  analytics: boolean;
  marketing: boolean;
  /** ISO timestamp the decision was recorded. */
  timestamp: string;
};

const COOKIE_NAME = 'cc-consent';
const MAX_AGE_DAYS = 180;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

const OPEN_SETTINGS_EVENT = 'consent:open-settings';
const CHANGE_EVENT = 'consent:change';

/* ----------------------- Read / write ----------------------- */

export function readConsent(): ConsentDecision | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]*)'),
  );
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      timestamp:
        typeof parsed.timestamp === 'string' ? parsed.timestamp : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(input: { analytics: boolean; marketing: boolean }): ConsentDecision {
  const decision: ConsentDecision = {
    necessary: true,
    analytics: input.analytics,
    marketing: input.marketing,
    timestamp: new Date().toISOString(),
  };
  if (typeof document !== 'undefined') {
    const value = encodeURIComponent(JSON.stringify(decision));
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: decision }));
  }
  return decision;
}

/* ----------------------- Re-open from elsewhere ----------------------- */

/** Fire from a footer link / cookies page button to reopen the banner. */
export function openConsentSettings(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  }
}

/** Used by the banner to listen for re-open requests. */
export function onOpenConsentSettings(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(OPEN_SETTINGS_EVENT, callback);
  return () => window.removeEventListener(OPEN_SETTINGS_EVENT, callback);
}

/** Listen for decisions so analytics scripts can opt-in/out without a reload. */
export function onConsentChange(callback: (decision: ConsentDecision) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (e: Event) => {
    const ce = e as CustomEvent<ConsentDecision>;
    if (ce.detail) callback(ce.detail);
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

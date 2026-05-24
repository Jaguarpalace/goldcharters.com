'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  onOpenConsentSettings,
  readConsent,
  writeConsent,
  type ConsentDecision,
} from '@/lib/consent/consent';

type Panel = 'collapsed' | 'expanded';

/**
 * UK GDPR cookie consent banner.
 *
 * Visual: floating gold-edged card pinned to the bottom-right on desktop,
 *         full-width sheet pinned to the bottom on phones.
 * Behaviour:
 *   - Renders nothing until mounted (avoids hydration mismatch).
 *   - Shows on first visit; auto-hides once a decision is recorded.
 *   - Can be re-opened from anywhere via `openConsentSettings()`.
 *   - "Accept all" and "Reject all" sit side-by-side, equal prominence.
 *   - "Customise" reveals per-category toggles; necessary is locked on.
 */
export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState<Panel>('collapsed');
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  // First render — read any prior decision.
  useEffect(() => {
    setMounted(true);
    const existing = readConsent();
    if (!existing) {
      // Small delay so the banner doesn't fight LCP / hero animations.
      const t = window.setTimeout(() => setVisible(true), 600);
      return () => window.clearTimeout(t);
    }
    setAnalytics(existing.analytics);
    setMarketing(existing.marketing);
  }, []);

  // Allow other parts of the app (footer link, /cookies page) to re-open the panel.
  useEffect(() => {
    return onOpenConsentSettings(() => {
      const existing = readConsent();
      if (existing) {
        setAnalytics(existing.analytics);
        setMarketing(existing.marketing);
      }
      setPanel('expanded');
      setVisible(true);
    });
  }, []);

  const acceptAll = useCallback(() => {
    writeConsent({ analytics: true, marketing: true });
    setVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    writeConsent({ analytics: false, marketing: false });
    setVisible(false);
  }, []);

  const savePreferences = useCallback(() => {
    writeConsent({ analytics, marketing });
    setVisible(false);
  }, [analytics, marketing]);

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3 sm:justify-end sm:px-5 sm:pb-5"
    >
      <div
        className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-xl border border-gold-metallic/30 bg-ink-950/95 shadow-[0_20px_60px_-10px_rgba(212,175,55,0.35)] backdrop-blur"
        style={{
          animation: 'gcReveal 0.45s ease-out both',
        }}
      >
        {/* Hairline gold gradient edge */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), rgba(255,215,0,0.85), rgba(212,175,55,0.6), transparent)',
          }}
        />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-gold-metallic"
              style={{
                background:
                  'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(255,215,0,0.05))',
                boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.35)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.5 11.5a9.5 9.5 0 1 1-9-9 4 4 0 0 0 5 5 4 4 0 0 0 4 4z" />
                <circle cx="9" cy="13" r="0.7" fill="currentColor" />
                <circle cx="14" cy="9" r="0.7" fill="currentColor" />
                <circle cx="15" cy="15" r="0.7" fill="currentColor" />
                <circle cx="8" cy="9" r="0.7" fill="currentColor" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
                Your Privacy
              </p>
              <h2
                id="cookie-consent-title"
                className="mt-1 font-display text-lg leading-tight text-white"
              >
                Cookies on Charters Gold
              </h2>
            </div>
          </div>

          <p className="mt-3 text-[12px] leading-relaxed text-warmgrey">
            We use a small number of cookies to run the site, remember your basket and — only with
            your permission — understand how visitors use the site so we can improve it. You can
            change your choice at any time via the footer.{' '}
            <Link
              href="/cookies"
              className="text-gold-tint underline decoration-gold-metallic/40 underline-offset-2 hover:text-gold-bright"
            >
              Read full policy
            </Link>
          </p>

          {panel === 'expanded' && (
            <div className="mt-4 space-y-2 rounded-lg border border-gold-metallic/15 bg-ink-900/60 p-3">
              <CategoryRow
                title="Strictly necessary"
                description="Authentication, basket and security. Always on — the site can't function without these."
                locked
                checked
              />
              <CategoryRow
                title="Analytics"
                description="Anonymous data about which pages people visit, so we can improve them."
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                title="Marketing"
                description="Used to measure the performance of our adverts and offers across other sites."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {panel === 'collapsed' ? (
              <>
                <button
                  type="button"
                  onClick={() => setPanel('expanded')}
                  className="text-[11px] font-medium uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
                >
                  Customise
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="rounded-full border border-gold-metallic/50 bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:border-gold-metallic hover:text-gold-bright"
                  >
                    Reject all
                  </button>
                  <button
                    type="button"
                    onClick={acceptAll}
                    className="rounded-full bg-gold-gradient px-4 py-2 text-[12px] font-semibold uppercase tracking-luxe text-ink-950 shadow-[0_0_18px_rgba(212,175,55,0.3)] transition hover:shadow-[0_0_24px_rgba(255,215,0,0.4)]"
                  >
                    Accept all
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPanel('collapsed')}
                  className="text-[11px] font-medium uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
                >
                  ← Back
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={rejectAll}
                    className="text-[11px] font-medium uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
                  >
                    Reject all
                  </button>
                  <button
                    type="button"
                    onClick={savePreferences}
                    className="rounded-full bg-gold-gradient px-4 py-2 text-[12px] font-semibold uppercase tracking-luxe text-ink-950 shadow-[0_0_18px_rgba(212,175,55,0.3)] transition hover:shadow-[0_0_24px_rgba(255,215,0,0.4)]"
                  >
                    Save preferences
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Per-category toggle row ----------------------- */

function CategoryRow({
  title,
  description,
  checked,
  locked = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-warmgrey">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={locked}
        onClick={() => onChange?.(!checked)}
        className={
          'relative mt-0.5 h-5 w-9 flex-none rounded-full border transition disabled:cursor-not-allowed ' +
          (checked
            ? 'border-gold-metallic bg-gold-metallic/30'
            : 'border-gold-metallic/30 bg-ink-950')
        }
      >
        <span
          aria-hidden
          className={
            'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ' +
            (checked ? 'left-[18px] bg-gold-bright shadow-[0_0_8px_rgba(255,215,0,0.6)]' : 'left-0.5 bg-warmgrey/60')
          }
        />
      </button>
    </div>
  );
}

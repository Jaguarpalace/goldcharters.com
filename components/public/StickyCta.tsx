'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GetValuationLink } from '@/components/public/GetValuationLink';
import { track } from '@/lib/analytics/track';
import { readConsent, onConsentChange } from '@/lib/consent/consent';
import { formatUkPhone } from '@/lib/format';

/**
 * Always-available call to action, pinned to the bottom of every public page.
 *
 * Why it exists: paid traffic lands on /sell-gold and /sell-jewellery, where
 * the valuation form sits roughly four screens down on a phone. This keeps
 * "get a valuation" and "call" under the visitor's thumb the whole way down
 * the page instead of only at the top and bottom.
 *
 * Positioning, so it never fights the other floating furniture:
 *   - Cookie sheet is z-[60]; this bar is z-[55] and lifts itself above the
 *     sheet on phones until a consent decision is made (the sheet is a
 *     full-width sheet on mobile, a bottom-right card on desktop).
 *   - The floating WhatsApp pill sits bottom-LEFT from md upward, so the
 *     desktop pill here is centred and capped in width to clear it.
 *   - Hidden inside /admin, and hidden while the valuation form is actually
 *     on screen (no point shouting "get a valuation" at a visible form).
 */
export function StickyCta({ phone }: { phone: string | null | undefined }) {
  const pathname = usePathname() ?? '/';
  const [shown, setShown] = useState(false);
  const [consentDecided, setConsentDecided] = useState(true);
  const [formOnScreen, setFormOnScreen] = useState(false);

  // Slide in after the hero has settled, same timing as the WhatsApp pill.
  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  // While the cookie sheet is undecided it covers the bottom of a phone
  // screen, so sit above it rather than underneath.
  useEffect(() => {
    setConsentDecided(Boolean(readConsent()));
    return onConsentChange(() => setConsentDecided(true));
  }, []);

  // Stand down while the form itself is in view.
  useEffect(() => {
    const form = document.getElementById('valuation-form');
    if (!form) {
      setFormOnScreen(false);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setFormOnScreen(entry.isIntersecting),
      { rootMargin: '-10% 0px -25% 0px' },
    );
    io.observe(form);
    return () => io.disconnect();
  }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  const digits = (phone ?? '').replace(/\D/g, '');
  const visible = shown && !formOnScreen;

  return (
    <div
      className={
        'pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-3 transition-all duration-300 ' +
        (consentDecided ? 'bottom-0 pb-3' : 'bottom-0 pb-[168px] sm:pb-3') +
        (visible ? ' translate-y-0 opacity-100' : ' pointer-events-none translate-y-4 opacity-0')
      }
    >
      <div
        className={
          'pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-full border border-gold-metallic/35 ' +
          'bg-ink-950/90 p-1.5 shadow-[0_16px_44px_-10px_rgba(212,175,55,0.5)] backdrop-blur'
        }
      >
        <GetValuationLink
          className="gc-btn-primary flex-1 whitespace-nowrap px-4 py-2.5 text-center text-[12px]"
          onNavigate={() => track('cta_click', { where: 'sticky-cta', page: pathname })}
        >
          Get your figure
        </GetValuationLink>

        {digits && (
          <a
            href={`tel:${digits}`}
            onClick={() => track('phone_click', { where: 'sticky-cta' })}
            className="flex flex-none items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:text-gold-bright"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.26-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            <span className="hidden sm:inline">{formatUkPhone(phone ?? '')}</span>
            <span className="sm:hidden">Call</span>
          </a>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { SiteSettings } from '@/types/database';
import { Logo } from './Logo';
import { BasketIndicator } from '@/components/shop/BasketIndicator';
import { BUY_ENABLED } from '@/lib/features';
import { GetValuationLink } from './GetValuationLink';
import { buildWhatsappUrl } from '@/lib/whatsapp';

const SELL_LINKS = [
  { label: 'Sell Gold', href: '/sell-gold' },
  { label: 'Sell Silver', href: '/sell-silver' },
  { label: 'Sell Jewellery', href: '/sell-jewellery' },
  { label: 'Sell Handbags', href: '/sell-handbags' },
  { label: 'Sell Watches', href: '/sell-watches' },
  { label: 'Gold Calculator', href: '/gold-calculator' },
];

const BUY_LINKS = [
  { label: 'Buy Jewellery', href: '/shop' },
  { label: 'Shop Gold', href: '/shop?category=gold-coins' },
];

const INFO_LINKS = [
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
];

/** Standalone "Book a visit" CTA — a glowing gold-edged pill with a calendar
 *  glyph. Distinct from the solid-gold primary so it draws the eye without
 *  competing with "Get a Valuation". */
function BookVisitButton({ className = '', onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      href="/book"
      onClick={onClick}
      className={
        'group relative inline-flex items-center justify-center gap-2 rounded-full border border-gold-metallic/60 ' +
        'bg-gradient-to-r from-ink-900/80 via-ink-800/70 to-ink-900/80 px-5 py-2.5 text-[12px] font-semibold ' +
        'uppercase tracking-luxe text-gold-bright shadow-[0_0_18px_-5px_rgba(243,204,15,0.55)] transition ' +
        'hover:border-gold-bright hover:text-white hover:shadow-[0_0_26px_-3px_rgba(243,204,15,0.85)] ' +
        className
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
        <rect x="3" y="4.5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" strokeLinecap="round" />
        <path d="M9.5 14l1.8 1.8 3.7-3.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Book a visit
    </Link>
  );
}

export function Header({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin has its own chrome — skip the public header entirely there.
  if (pathname?.startsWith('/admin')) return null;

  const phoneDigits = settings.phone.replace(/\s+/g, '');
  const whatsappHref = buildWhatsappUrl(settings.whatsapp, pathname ?? '/');

  return (
    <header className="sticky top-0 z-20 border-b border-gold-metallic/15 bg-ink-950/85 backdrop-blur-md">
      <div className="gc-container flex h-24 items-center justify-between gap-4 sm:h-32">
        {/* Left cluster: logo + (desktop only) Get a Valuation CTA. Pulling
            the primary CTA next to the brand on lg+ makes it the first
            thing the eye lands on without having to track all the way
            across the header. The right-side instance below is hidden on
            lg so we don't end up with two of them. */}
        <div className="flex items-center gap-3 lg:gap-10">
          <Logo businessName={settings.business_name} size="compact" />
          <GetValuationLink className="gc-btn-primary hidden whitespace-nowrap !px-7 !py-3.5 text-[15px] lg:inline-flex">
            Get a Valuation
          </GetValuationLink>
        </div>

        {/* Centre nav, desktop only */}
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          <NavGroup label="What We Buy" links={SELL_LINKS} />
          {BUY_ENABLED && <NavGroup label="Shop" links={BUY_LINKS} />}
          {INFO_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-warmgrey hover:text-gold-bright"
            >
              {l.label}
            </Link>
          ))}
          <BookVisitButton />
        </nav>

        {/* Right cluster: phone · calculator · valuation CTA · basket · mobile menu */}
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Phone - compact, tablet+ only. Live ticker removed from the
              public header; live spot data still drives the calculator and
              lives in the admin price-dashboard. */}
          <a
            href={`tel:${phoneDigits}`}
            className="hidden items-center gap-1.5 whitespace-nowrap text-[12px] font-medium uppercase tracking-luxe text-gold-tint hover:text-gold-bright md:inline-flex"
          >
            <PhoneIcon />
            {settings.phone}
          </a>

          {BUY_ENABLED && <BasketIndicator />}

          {/* Calculator - secondary CTA. Compact pill so the primary
              "Get a Valuation" gradient still leads the eye. */}
          <Link
            href="/gold-calculator"
            className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-gold-metallic/40 px-4 py-2 text-[12px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:border-gold-metallic hover:bg-ink-900/70 hover:text-gold-bright sm:inline-flex"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <rect x="4" y="3" width="16" height="18" rx="2" />
              <path d="M7 7h10M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2M15 15h2M7 19h2M11 19h2M15 19h2" />
            </svg>
            Calculator
          </Link>

          {/* Tablet-only instance - desktop shows the bigger CTA next to the
              logo in the left cluster, so we hide this one from lg up. */}
          <GetValuationLink className="gc-btn-primary hidden whitespace-nowrap sm:inline-flex lg:hidden">
            Get a Valuation
          </GetValuationLink>

          {/* WhatsApp - mobile only. On md+ the floating WhatsApp pill takes
              over (see WhatsAppButton.tsx). Sized to match the hamburger. */}
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-metallic/30 bg-ink-900/60"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#25D366"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
          )}

          {/* Mobile menu trigger */}
          <button
            type="button"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-metallic/30 text-gold-metallic"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gold-metallic/15 bg-ink-950">
          <nav className="gc-container flex flex-col gap-2 py-4">
            {/* Phone strip at the top of the drawer */}
            <a
              href={`tel:${phoneDigits}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gold-metallic/15 bg-ink-900/60 px-4 py-2.5 text-[11px] font-medium uppercase tracking-luxe text-gold-tint"
            >
              <PhoneIcon />
              {settings.phone}
            </a>

            <MobileSection label="What We Buy" links={SELL_LINKS} onClick={() => setMobileOpen(false)} />
            {BUY_ENABLED && (
              <MobileSection label="Shop" links={BUY_LINKS} onClick={() => setMobileOpen(false)} />
            )}
            <MobileSection label="More" links={INFO_LINKS} onClick={() => setMobileOpen(false)} />

            <BookVisitButton className="mt-2 w-full !py-3" onClick={() => setMobileOpen(false)} />

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                href="/gold-calculator"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gold-metallic/50 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-luxe text-gold-tint hover:border-gold-metallic hover:text-gold-bright"
              >
                Calculator
              </Link>
              <GetValuationLink
                className="gc-btn-primary w-full"
                onNavigate={() => setMobileOpen(false)}
              >
                Get a Valuation
              </GetValuationLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/** Compact phone handset glyph used next to the header phone number. */
function PhoneIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function NavGroup({ label, links }: { label: string; links: { label: string; href: string }[] }) {
  return (
    <div className="group relative">
      <button className="inline-flex items-center gap-1 text-sm font-medium text-warmgrey hover:text-gold-bright">
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l3 3 3-3" />
        </svg>
      </button>
      <div className="invisible absolute left-1/2 top-full z-30 mt-3 w-56 -translate-x-1/2 rounded-xl border border-gold-metallic/20 bg-ink-900/95 p-2 opacity-0 backdrop-blur-md transition-all duration-200 group-hover:visible group-hover:opacity-100">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-lg px-3 py-2 text-sm text-warmgrey hover:bg-ink-800 hover:text-gold-bright"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileSection({
  label,
  links,
  onClick,
}: {
  label: string;
  links: { label: string; href: string }[];
  onClick: () => void;
}) {
  return (
    <div className="rounded-xl border border-gold-metallic/15 bg-ink-900/60">
      <div className="border-b border-gold-metallic/15 px-4 py-2 text-[11px] uppercase tracking-luxe text-gold-tint">
        {label}
      </div>
      <ul className="py-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onClick}
              className="block px-4 py-2.5 text-sm text-white hover:text-gold-bright"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

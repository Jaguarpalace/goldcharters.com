'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { SiteSettings } from '@/types/database';
import { Logo } from './Logo';
import { BasketIndicator } from '@/components/shop/BasketIndicator';
import { BUY_ENABLED } from '@/lib/features';
import { GetValuationLink } from './GetValuationLink';

const SELL_LINKS = [
  { label: 'Sell Gold', href: '/sell-gold' },
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

export function Header({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Admin has its own chrome — skip the public header entirely there.
  if (pathname?.startsWith('/admin')) return null;

  const phoneDigits = settings.phone.replace(/\s+/g, '');

  return (
    <header className="sticky top-0 z-20 border-b border-gold-metallic/15 bg-ink-950/85 backdrop-blur-md">
      <div className="gc-container flex h-20 items-center justify-between gap-4 sm:h-24">
        {/* Compact logo, left */}
        <Logo businessName={settings.business_name} size="compact" />

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
        </nav>

        {/* Right cluster: phone · calculator · valuation CTA · basket · mobile menu */}
        <div className="flex items-center gap-3 lg:gap-4">
          {/* Phone — compact, tablet+ only. Live ticker removed from the
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

          {/* Calculator — secondary CTA. Compact pill so the primary
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

          <GetValuationLink className="gc-btn-primary hidden whitespace-nowrap sm:inline-flex">
            Get a Valuation
          </GetValuationLink>

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

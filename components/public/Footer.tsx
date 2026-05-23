'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SiteSettings } from '@/types/database';
import { Logo } from './Logo';
import { BUY_ENABLED } from '@/lib/features';

const SELL_LINKS = [
  { label: 'Sell Gold', href: '/sell-gold' },
  { label: 'Sell Jewellery', href: '/sell-jewellery' },
  { label: 'Sell Handbags', href: '/sell-handbags' },
  { label: 'Sell Watches', href: '/sell-watches' },
  { label: 'Gold Calculator', href: '/gold-calculator' },
];

const INFO_LINKS = [
  ...(BUY_ENABLED ? [{ label: 'Shop Collection', href: '/shop' }] : []),
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
];

export function Footer({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  // Skip the marketing footer inside the admin area.
  if (pathname?.startsWith('/admin')) return null;

  return (
    <footer className="border-t border-gold-metallic/15 bg-ink-950">
      <div className="gc-container py-8 lg:py-10">
        {/* Top row: brand on the left, columns of links on the right.
            On wide screens this lays out as one balanced horizontal stripe. */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.6fr,1fr,1fr,1fr,1fr] lg:items-start lg:gap-8">
          {/* Brand column — compact logo + short description */}
          <div className="lg:max-w-sm">
            <Logo businessName={settings.business_name} size="compact" />
            <p className="mt-3 text-xs leading-relaxed text-warmgrey">
              {settings.footer_description}
            </p>
          </div>

          <FooterCol title="What We Buy">
            <ul className="space-y-1.5 text-xs">
              {SELL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-warmgrey hover:text-gold-bright">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterCol>

          <FooterCol title="More">
            <ul className="space-y-1.5 text-xs">
              {INFO_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-warmgrey hover:text-gold-bright">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterCol>

          <FooterCol title="Visit & Contact">
            {settings.address && (
              <p className="text-xs leading-relaxed text-warmgrey">{settings.address}</p>
            )}
            <p className="mt-2 text-xs">
              <a href={`tel:${settings.phone}`} className="block text-warmgrey hover:text-gold-bright">
                {settings.phone}
              </a>
              <a
                href={`mailto:${settings.email}`}
                className="mt-1 block text-warmgrey hover:text-gold-bright"
              >
                {settings.email}
              </a>
            </p>
            {settings.opening_hours && (
              <p className="mt-2 text-xs text-warmgrey">{settings.opening_hours}</p>
            )}
          </FooterCol>

          <FooterCol title="Legal">
            <ul className="space-y-1.5 text-xs">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-warmgrey hover:text-gold-bright">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterCol>
        </div>

        <div className="my-5 gc-divider" />

        <div className="flex flex-col gap-2 text-[11px] leading-relaxed text-warmgrey/80 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-4xl">{settings.footer_disclaimer}</p>
          <p className="flex-none">
            © {new Date().getFullYear()} {settings.business_name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
        {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

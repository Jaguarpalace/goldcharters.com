'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { SiteSettings } from '@/types/database';
import { Logo } from './Logo';
import { BUY_ENABLED } from '@/lib/features';
import { openConsentSettings } from '@/lib/consent/consent';
import { LOCATIONS } from '@/lib/content/locations';

const SELL_LINKS = [
  { label: 'Sell Gold', href: '/sell-gold' },
  { label: 'Sell Silver', href: '/sell-silver' },
  { label: 'Sell Jewellery', href: '/sell-jewellery' },
  { label: 'Sell Handbags', href: '/sell-handbags' },
  { label: 'Sell Watches', href: '/sell-watches' },
  { label: 'Gold Calculator', href: '/gold-calculator' },
];

const INFO_LINKS = [
  ...(BUY_ENABLED ? [{ label: 'Shop Collection', href: '/shop' }] : []),
  { label: 'Book / Visit Us', href: '/book' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Areas We Cover', href: '/locations' },
  { label: 'Blog', href: '/blog' },
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
      <div className="gc-container py-6 lg:py-10">
        {/*
          Layout strategy:
          - Mobile: brand block full-width on top, then a 2×2 grid of the four
            info columns underneath (was 4 stacked single-column blocks before
            — half the vertical height now).
          - Desktop (lg+): we use `lg:contents` on the inner wrapper so its
            children flatten into the parent 5-column grid — same horizontal
            stripe layout we had before, no duplication.
        */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr,1fr,1fr,1fr,1fr] lg:items-start lg:gap-8">
          {/* Brand block — logo only. The descriptive paragraph used to
              sit here in a narrow column and wrap to 4 lines; it now
              lives as its own full-width row below the columns grid
              where the full sentence has room to read on one line. */}
          <div className="lg:max-w-sm">
            <Logo businessName={settings.business_name} size="footer" />
          </div>

          <div className="grid grid-cols-2 gap-6 lg:contents">
            <FooterCol title="What We Buy">
              <ul className="space-y-1 text-xs">
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
              <ul className="space-y-1 text-xs">
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
                <p className="text-xs leading-snug text-warmgrey">{settings.address}</p>
              )}
              <p className="mt-2 space-y-0.5 text-xs">
                <a
                  href={`tel:${settings.phone}`}
                  className="block text-warmgrey hover:text-gold-bright"
                >
                  {settings.phone}
                </a>
                <a
                  href={`mailto:${settings.email}`}
                  className="block break-all text-warmgrey hover:text-gold-bright"
                >
                  {settings.email}
                </a>
              </p>
              {settings.opening_hours && (
                <p className="mt-2 text-[11px] leading-snug text-warmgrey/80">
                  {settings.opening_hours}
                </p>
              )}
            </FooterCol>

            <FooterCol title="Legal">
              <ul className="space-y-1 text-xs">
                {LEGAL_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-warmgrey hover:text-gold-bright">
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={openConsentSettings}
                    className="text-warmgrey transition hover:text-gold-bright"
                  >
                    Cookie Preferences
                  </button>
                </li>
              </ul>
            </FooterCol>
          </div>
        </div>

        {/* Brand description — pulled out of the narrow brand column and
            rendered full-width here so the whole sentence fits on one
            line on desktop. Hidden on phones to keep the mobile footer
            tight. */}
        {settings.footer_description && (
          <p className="mt-6 hidden text-xs text-warmgrey sm:block lg:mt-8">
            {settings.footer_description}
          </p>
        )}

        <div className="my-4 gc-divider lg:my-5" />

        {/* Areas-we-cover sub-footer. Distributes internal PageRank to every
            location page from every page on the site, and signals service
            area to Google. */}
        <div className="mb-4 lg:mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
            Areas We Cover
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {LOCATIONS.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/locations/${l.slug}`}
                  className="inline-flex items-center rounded-full border border-gold-metallic/20 bg-ink-900/50 px-2.5 py-1 text-[11px] text-warmgrey hover:border-gold-metallic/50 hover:text-gold-bright"
                >
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1.5 text-[10px] leading-relaxed text-warmgrey/80 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:text-[11px]">
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
      <div className="mt-2">{children}</div>
    </div>
  );
}

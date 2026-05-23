import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you were looking for could not be found.',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
      <div className="gc-container relative grid place-items-center py-20 text-center lg:py-28">
        <span className="gc-eyebrow">404 · Page Not Found</span>
        <h1 className="gc-heading-xl mt-4">This page has been valued elsewhere</h1>
        <p className="gc-subhead mt-5 max-w-xl">
          The page you were looking for couldn&apos;t be found. It may have been moved or removed.
          Browse the most popular sections below — or get in touch with our team directly.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="gc-btn-primary">
            Return Home
          </Link>
          <Link href="/sell-gold" className="gc-btn-secondary">
            Get a Valuation
          </Link>
        </div>

        <ul className="mt-12 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Sell Gold', href: '/sell-gold' },
            { label: 'Sell Jewellery', href: '/sell-jewellery' },
            { label: 'Sell Designer Handbags', href: '/sell-handbags' },
            { label: 'Sell Luxury Watches', href: '/sell-watches' },
            { label: 'Gold Calculator', href: '/gold-calculator' },
            { label: 'Frequently Asked Questions', href: '/faqs' },
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="gc-card flex items-center justify-between gap-3 p-4 transition hover:bg-ink-800/60"
              >
                <span className="font-medium text-white">{l.label}</span>
                <span aria-hidden className="text-gold-metallic">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { BUY_PAGES } from '@/lib/content/buy';
import { SITE_URL } from '@/lib/seo/structuredData';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'What We Buy — Gold, Jewellery, Watches & Handbags | Charters Gold',
  description:
    'A guide to the pieces we value most frequently. Gold jewellery, broken gold, unwanted jewellery, wedding rings, vintage and branded pieces, luxury necklaces and bracelets.',
  alternates: { canonical: `${SITE_URL}/we-buy` },
};

export default function WeBuyIndexPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-10 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">What We Buy</span>
            <h1 className="gc-heading-xl mt-3">Pieces We Value Every Week</h1>
            <p className="gc-subhead mt-5">
              The pieces our specialists handle most regularly. Choose the closest match for a
              tailored guide on how we value it, what we look for, and the discreet ways we can
              work with you.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2">
            {BUY_PAGES.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/we-buy/${p.slug}`}
                  className="group flex h-full items-start gap-4 rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5 transition hover:border-gold-metallic hover:bg-ink-800/40"
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-gold-metallic group-hover:text-gold-bright"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(255,215,0,0.04))',
                      boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.3)',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 9l8-4 8 4-8 4z" />
                      <path d="M4 9v8l8 4 8-4V9" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold leading-tight text-white">
                      {p.name}
                    </span>
                    <span className="mt-2 block text-[12px] leading-relaxed text-warmgrey">
                      {p.heroIntro.split('. ')[0]}.
                    </span>
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                    className="mt-1.5 flex-none text-gold-metallic/70 transition group-hover:translate-x-0.5 group-hover:text-gold-bright"
                  >
                    <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

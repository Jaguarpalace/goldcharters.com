import type { Metadata } from 'next';
import Link from 'next/link';
import { LOCATIONS } from '@/lib/content/locations';
import { SITE_URL } from '@/lib/seo/structuredData';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Areas We Cover — Gold & Jewellery Valuations across Surrey, London & the Thames Valley',
  description:
    'Private gold, watch, jewellery and handbag valuations across London, Surrey, Berkshire, Windsor, Ascot, Heathrow, Reading, Twickenham and Richmond — all served from our Egham office.',
  alternates: { canonical: `${SITE_URL}/locations` },
};

export default function LocationsIndexPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-7 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Areas We Cover</span>
            <h1 className="gc-heading-xl mt-3">Specialist Valuations across the South-East</h1>
            <p className="gc-subhead mt-5">
              From our Egham office we serve clients across London, Surrey, Berkshire and the Thames
              Valley — in person, by private home visit, or by insured postal service. Choose your
              area for a tailored guide.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <ul className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2">
            {LOCATIONS.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/locations/${l.slug}`}
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
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 21s-7-7.5-7-12a7 7 0 0114 0c0 4.5-7 12-7 12z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold leading-tight text-white">
                      {l.name}
                    </span>
                    {l.region && (
                      <span className="mt-0.5 block text-[11px] uppercase tracking-luxe text-gold-tint">
                        {l.region}
                      </span>
                    )}
                    <span className="mt-2 block text-[12px] leading-relaxed text-warmgrey">
                      {l.heroIntro.split('. ')[0]}.
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

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllLocationSlugs, getLocationBySlug } from '@/lib/content/locations';
import { getSiteSettings } from '@/lib/queries/homepage';
import { JsonLd } from '@/lib/seo/JsonLd';
import {
  locationFaqSchema,
  locationLocalBusinessSchema,
  SITE_URL,
} from '@/lib/seo/structuredData';
import { ValuationForm } from '@/components/public/ValuationForm';
import { GetValuationLink } from '@/components/public/GetValuationLink';

// Statically pre-render every location at build time → fastest possible
// response, perfect Lighthouse score, ideal for SEO crawlers.
export function generateStaticParams() {
  return getAllLocationSlugs().map((slug) => ({ slug }));
}

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const location = getLocationBySlug(params.slug);
  if (!location) return {};
  return {
    title: location.metaTitle,
    description: location.metaDescription,
    alternates: { canonical: `${SITE_URL}/locations/${location.slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/locations/${location.slug}`,
      title: location.metaTitle,
      description: location.metaDescription,
      locale: 'en_GB',
    },
  };
}

export default async function LocationPage({ params }: { params: { slug: string } }) {
  const location = getLocationBySlug(params.slug);
  if (!location) notFound();

  const settings = await getSiteSettings();

  return (
    <>
      <JsonLd
        data={[
          locationLocalBusinessSchema({
            settings,
            locationSlug: location.slug,
            locationName: location.name,
            region: location.region,
            description: location.metaDescription,
          }),
          locationFaqSchema(location.faqs),
        ]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-7 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">{location.heroEyebrow}</span>
            <h1 className="gc-heading-xl mt-3">{location.heroTitle}</h1>
            <p className="gc-subhead mt-5">{location.heroIntro}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <GetValuationLink className="gc-btn-primary">Get a Valuation</GetValuationLink>
              <Link href="/gold-calculator" className="gc-btn-secondary">
                Open Calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRAVEL + WHY HERE */}
      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <div className="grid gap-8 lg:grid-cols-[1fr,1.4fr] lg:gap-12">
            {/* Travel card */}
            <aside className="gc-card gc-card-gold-edge h-fit p-6 lg:sticky lg:top-28">
              <p className="text-xs font-semibold uppercase tracking-luxe text-gold-metallic">
                Travel to our Egham office
              </p>
              <div className="mt-4 space-y-4 text-sm text-warmgrey">
                <Detail label="Distance" value={`${location.travel.distanceMiles} miles from our office`} />
                <Detail label="By car" value={location.travel.drive} />
                <Detail label="By public transport" value={location.travel.publicTransport} />
                {location.postcodes && (
                  <Detail label="Postcodes we cover" value={location.postcodes} />
                )}
              </div>
            </aside>

            {/* Why here */}
            <div>
              <span className="gc-eyebrow">Why {location.name} clients choose us</span>
              <h2 className="gc-heading mt-3">A specialist conversation, not a transaction</h2>
              <ul className="mt-6 space-y-5">
                {location.whyHere.map((reason) => (
                  <li
                    key={reason.title}
                    className="rounded-xl border border-gold-metallic/15 bg-ink-900/40 p-5"
                  >
                    <h3 className="font-display text-lg font-semibold text-white">{reason.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-warmgrey">{reason.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS OPTIONS */}
      <section className="py-8 lg:py-12 border-y border-gold-metallic/15 bg-ink-900/40">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">How it works for {location.name} clients</span>
            <h2 className="gc-heading mt-3">Three ways to engage with us</h2>
          </div>
          <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
            {location.processOptions.map((opt, idx) => (
              <li
                key={opt.title}
                className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5"
              >
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gold-bright"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(255,215,0,0.05))',
                    boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.4)',
                  }}
                >
                  <ProcessIcon kind={opt.icon} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-white">
                  {idx + 1}. {opt.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgrey">{opt.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* NEIGHBOURHOODS + COMMON PIECES */}
      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <span className="gc-eyebrow">Areas we cover within {location.name}</span>
              <h2 className="gc-heading mt-3">Neighbourhoods &amp; postcodes</h2>
              <ul className="mt-6 flex flex-wrap gap-1.5">
                {location.neighbourhoods.map((n) => (
                  <li key={n}>
                    <span className="inline-flex items-center rounded-full border border-gold-metallic/25 bg-ink-900/50 px-3 py-1 text-[12px] text-warmgrey">
                      {n}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="gc-eyebrow">What we frequently value here</span>
              <h2 className="gc-heading mt-3">{location.commonPieces.title}</h2>
              <p className="mt-5 text-sm leading-relaxed text-warmgrey">{location.commonPieces.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-8 lg:py-12 border-y border-gold-metallic/15 bg-ink-900/40">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl">
            <span className="gc-eyebrow">{location.name} - Frequently Asked</span>
            <h2 className="gc-heading mt-3">Local questions, answered</h2>
            <ul className="mt-6 space-y-3">
              {location.faqs.map((f) => (
                <li
                  key={f.question}
                  className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5"
                >
                  <h3 className="font-display text-base font-semibold text-white">{f.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-warmgrey">{f.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA + INLINE VALUATION FORM */}
      <section className="py-8 lg:py-12" id="valuation-form">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">{location.cta.title}</span>
            <h2 className="gc-heading mt-3">Request a Private Valuation</h2>
            <p className="gc-subhead mt-4">{location.cta.body}</p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <ValuationForm variant="metal" />
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- Small presentational helpers ---------- */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-white">{value}</p>
    </div>
  );
}

function ProcessIcon({ kind }: { kind: 'in-person' | 'collect' | 'post' }) {
  const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 } as const;
  if (kind === 'in-person') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'collect') {
    return (
      <svg {...common}>
        <path d="M3 7h13l3 4v6h-3M3 7v10h2" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17" cy="18" r="1.8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="6" width="18" height="13" rx="1.5" />
      <path d="M3 8l9 6 9-6" />
    </svg>
  );
}

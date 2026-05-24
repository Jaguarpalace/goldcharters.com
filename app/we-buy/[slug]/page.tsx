import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllBuySlugs, getBuyPageBySlug } from '@/lib/content/buy';
import { JsonLd } from '@/lib/seo/JsonLd';
import { locationFaqSchema, SITE_URL } from '@/lib/seo/structuredData';
import { ValuationForm } from '@/components/public/ValuationForm';
import { GetValuationLink } from '@/components/public/GetValuationLink';

// Static prerender at build time for instant Lighthouse scores + best SEO.
export function generateStaticParams() {
  return getAllBuySlugs().map((slug) => ({ slug }));
}

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = getBuyPageBySlug(params.slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `${SITE_URL}/we-buy/${page.slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/we-buy/${page.slug}`,
      title: page.metaTitle,
      description: page.metaDescription,
      locale: 'en_GB',
    },
  };
}

export default function BuyPage({ params }: { params: { slug: string } }) {
  const page = getBuyPageBySlug(params.slug);
  if (!page) notFound();

  return (
    <>
      <JsonLd data={[locationFaqSchema(page.faqs)]} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-10 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">{page.heroEyebrow}</span>
            <h1 className="gc-heading-xl mt-3">{page.heroTitle}</h1>
            <p className="gc-subhead mt-5">{page.heroIntro}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <GetValuationLink className="gc-btn-primary">Get a Valuation</GetValuationLink>
              <Link href="/gold-calculator" className="gc-btn-secondary">
                Open Calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl space-y-8">
            {page.sections.map((s) => (
              <div key={s.title}>
                <h2 className="font-display text-2xl text-white">{s.title}</h2>
                <p className="mt-4 text-sm leading-relaxed text-warmgrey">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-gold-metallic/15 bg-ink-900/40 py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl">
            <span className="gc-eyebrow">{page.name} — Frequently Asked</span>
            <h2 className="gc-heading mt-3">Common questions</h2>
            <ul className="mt-6 space-y-3">
              {page.faqs.map((f) => (
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

      {/* CTA + INLINE FORM */}
      <section className="py-8 lg:py-12" id="valuation-form">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">{page.cta.title}</span>
            <h2 className="gc-heading mt-3">Request a Private Valuation</h2>
            <p className="gc-subhead mt-4">{page.cta.body}</p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <ValuationForm variant={page.group === 'gold' ? 'metal' : 'jewellery'} />
          </div>
        </div>
      </section>
    </>
  );
}

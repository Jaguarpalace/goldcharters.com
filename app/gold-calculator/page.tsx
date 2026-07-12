import type { Metadata } from 'next';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { CalculatorSpotBadge } from '@/components/public/CalculatorSpotBadge';
import { ValuationForm } from '@/components/public/ValuationForm';
import { JsonLd } from '@/lib/seo/JsonLd';
import { locationFaqSchema } from '@/lib/seo/structuredData';
import type { CalculatorRate } from '@/types/database';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/gold-calculator');
}

const gbp = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });

/**
 * FAQ copy doubles as crawlable answer-text for the "9ct gold price per
 * gram" query cluster (our biggest impression source in Search Console).
 * Keep the phrasings aligned with how people actually search.
 */
function buildFaqs(nineCt: CalculatorRate | undefined) {
  return [
    {
      question: 'How much is 9ct gold worth per gram today?',
      answer: nineCt
        ? `We are currently paying ${gbp(nineCt.price_per_gram)} per gram for 9ct gold. The rate moves with the live gold spot price, so the figure on this page refreshes throughout the day - enter your weight in the calculator above for an instant total.`
        : 'The rate moves with the live gold spot price and refreshes on this page throughout the day - enter the carat and weight in the calculator above for an instant figure.',
    },
    {
      question: 'Why is 9ct gold worth less per gram than 18ct or 22ct?',
      answer:
        '9ct gold is 37.5% pure gold; 18ct is 75% and 22ct is 91.6%. The per-gram price scales with purity, which is why a heavy 9ct chain can still be worth less than a light 22ct bangle. Every rate in our table is the purity-adjusted price we actually pay.',
    },
    {
      question: 'Is this the scrap price or the jewellery price?',
      answer:
        'The calculator shows our per-gram rate for gold sold by weight - what the trade calls the scrap rate. Signed, antique or gem-set pieces are often worth more than their weight, which is why every valuation is checked by a specialist before we quote: if your piece deserves jewellery pricing rather than metal pricing, we say so.',
    },
    {
      question: 'How is your rate different from the gold spot price?',
      answer:
        'The spot price is the wholesale market rate for pure 24ct gold. Our paying rate is the spot price adjusted for your item’s purity, less a transparent margin that covers refining and our costs. We show the rate before anything is weighed - you can check it against the live spot price at any time.',
    },
    {
      question: 'How do I sell after using the calculator?',
      answer:
        'Send photographs through the valuation form below for a written figure within one working day, book a private appointment at our Ascot office, or arrange a home visit. Payment is same-day by bank transfer once you accept.',
    },
  ];
}

export default async function GoldCalculatorPage() {
  const rates = await getCalculatorRates();

  const goldRates = rates.filter((r) => r.metal_type === 'Gold');
  const otherRates = rates.filter((r) => r.metal_type !== 'Gold');
  const nineCt = goldRates.find((r) => /9\s*ct/i.test(r.carat_label));
  const faqs = buildFaqs(nineCt);

  return (
    <>
      <JsonLd data={[locationFaqSchema(faqs)]} />

      <section className="relative py-6 lg:py-10">
        <div className="gc-container">
          <CalculatorSpotBadge />
        </div>
      </section>

      {/* GoldCalculator acts as the page hero - its title renders as <h1>. */}
      <GoldCalculator rates={rates} asH1 />

      {/* Crawlable price table — the calculator itself is interactive, so the
          per-gram rates are repeated here as plain HTML for search engines
          (and anyone who just wants today's number without typing). */}
      {rates.length > 0 && (
        <section className="py-8 lg:py-12 border-y border-gold-metallic/15 bg-ink-900/40">
          <div className="gc-container max-w-4xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="gc-eyebrow">Updated Throughout The Day</span>
              <h2 className="gc-heading mt-3">Today&rsquo;s Gold Price Per Gram</h2>
              <p className="gc-subhead mt-4">
                The rates below are what we pay per gram, adjusted for purity from the live spot
                price. No hidden testing fees, no percentage games - the rate you see is the rate
                on the scales.
              </p>
            </div>

            <div className="mx-auto mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gold-metallic/30 text-left text-[11px] uppercase tracking-luxe text-gold-tint">
                    <th className="py-3 pr-4 font-semibold">Metal &amp; carat</th>
                    <th className="py-3 pr-4 font-semibold">Purity</th>
                    <th className="py-3 text-right font-semibold">We pay per gram</th>
                  </tr>
                </thead>
                <tbody>
                  {[...goldRates, ...otherRates].map((r) => (
                    <tr key={r.id} className="border-b border-gold-metallic/10 text-warmgrey">
                      <td className="py-3 pr-4 font-medium text-white">
                        {r.metal_type === 'Gold' ? `${r.carat_label} gold` : `${r.metal_type} (${r.carat_label})`}
                      </td>
                      <td className="py-3 pr-4">{r.purity_percentage}%</td>
                      <td className="py-3 text-right font-semibold text-gold-bright">
                        {gbp(r.price_per_gram)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nineCt && (
              <div className="mx-auto mt-8 max-w-3xl">
                <h3 className="font-display text-lg font-semibold text-white">
                  What 9ct gold is worth at today&rsquo;s rate
                </h3>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[5, 10, 20, 50].map((grams) => (
                    <li
                      key={grams}
                      className="flex items-baseline justify-between rounded-xl border border-gold-metallic/20 bg-ink-900/60 px-4 py-3"
                    >
                      <span className="text-sm text-warmgrey">{grams}g of 9ct gold</span>
                      <span className="font-display text-base font-semibold text-gold-bright">
                        ≈ {gbp(nineCt.price_per_gram * grams)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-warmgrey/70">
                  Guide figures at our current 9ct paying rate of {gbp(nineCt.price_per_gram)} per
                  gram. Hallmarked weight only - stones and non-gold parts are excluded, and
                  signed or antique pieces are often worth more than their weight.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ — mirrors the top "9ct gold" search phrasings from Search Console. */}
      <section className="py-8 lg:py-12">
        <div className="gc-container max-w-3xl">
          <span className="gc-eyebrow">Gold Prices - Frequently Asked</span>
          <h2 className="gc-heading mt-3">9ct gold prices, explained</h2>
          <ul className="mt-6 space-y-3">
            {faqs.map((f) => (
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
      </section>

      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="metal" defaultItemType="gold" />
        </div>
      </section>
    </>
  );
}

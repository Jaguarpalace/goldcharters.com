import type { Metadata } from 'next';
import Link from 'next/link';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { getMetalSpots } from '@/lib/services/metalPrice';
import { formatDateGB, formatDateTimeGB } from '@/lib/format';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { ValuationForm } from '@/components/public/ValuationForm';
import { JsonLd } from '@/lib/seo/JsonLd';
import { locationFaqSchema } from '@/lib/seo/structuredData';
import type { CalculatorRate } from '@/types/database';

export const revalidate = 60;

const gbp = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });

const findGold = (rates: CalculatorRate[], carat: number) =>
  rates.find(
    (r) => r.metal_type === 'Gold' && new RegExp(`^\\s*${carat}\\s*ct`, 'i').test(r.carat_label),
  );

/**
 * Hallmark fineness stamp for a purity, e.g. 37.5% -> 375, 91.6% -> 916.
 * People search "375 gold price per gram" as often as "9ct", so the stamp
 * sits next to the carat everywhere on this page.
 */
const stamp = (purity: number) => Math.round(purity * 10).toString().padStart(3, '0');

/**
 * The page is built for one search family - "9ct gold price per gram
 * today" and its siblings for 14ct, 18ct and 22ct - so the title, heading
 * and description carry today's live figure. Search Console shows this
 * cluster as our biggest source of impressions and, until now, one of the
 * weakest for clicks.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadata('/gold-calculator');
  const rates = await getCalculatorRates();
  const nineCt = findGold(rates, 9);
  if (!nineCt) return base;

  const price = gbp(nineCt.price_per_gram);
  const title = `9ct Gold Price Per Gram Today: ${price} | UK Calculator`;
  const description = `9ct gold is worth ${price} per gram today, ${formatDateGB(new Date(), 'long')}. Live UK prices per gram for 9ct, 14ct, 18ct and 22ct scrap gold, a calculator, and what 5g, 10g and 20g are worth.`;
  return {
    ...base,
    title: { absolute: title },
    description,
    openGraph: { ...base.openGraph, title, description },
    twitter: { ...base.twitter, title, description },
  };
}

/**
 * FAQ copy doubles as crawlable answer-text for the "9ct gold price per
 * gram" query cluster. Every question is a phrasing that appears in
 * Search Console; answers carry today's live figures where they exist.
 */
function buildFaqs(rates: CalculatorRate[]) {
  const nine = findGold(rates, 9);
  const fourteen = findGold(rates, 14);
  const eighteen = findGold(rates, 18);
  const twentyTwo = findGold(rates, 22);
  const live = (r: CalculatorRate | undefined, label: string) =>
    r ? `${gbp(r.price_per_gram)} per gram for ${label}` : `the live rate for ${label} shown in the table above`;

  return [
    {
      question: 'How much is 9ct gold worth per gram today?',
      answer: nine
        ? `Today we are paying ${gbp(nine.price_per_gram)} per gram for 9ct gold. The rate moves with the live gold spot price, so this page refreshes through the day - enter your weight in the calculator above for an instant total, or read it off the table.`
        : 'The rate moves with the live gold spot price and refreshes on this page through the day - enter the carat and weight in the calculator above for an instant figure.',
    },
    {
      question: 'What is the price of 9ct gold per gram in the UK today, and why does it change?',
      answer:
        "Every UK buyer prices 9ct gold from the same starting point: the London spot price for pure gold, quoted per troy ounce and converted to pounds per gram. 9ct is 37.5% gold, so its value is 37.5% of that figure, less the buyer's margin. Spot moves all day with the market and the pound-dollar rate, which is why a 9ct price quoted on Monday can differ by Friday. Ours is recalculated from the live spot price and shown here with the time it was refreshed.",
    },
    {
      question: 'What is 375 gold, and is it the same as 9ct?',
      answer:
        'Yes. 375 is the hallmark stamp for 9ct gold: 375 parts per thousand, or 37.5% pure. In the same way 585 is 14ct, 750 is 18ct and 916 is 22ct. If your piece is stamped 375 you can read its price straight off the 9ct row above.',
    },
    {
      question: 'How much is 10 grams of 9ct gold worth?',
      answer: nine
        ? `At today's rate, 10 grams of 9ct gold is worth about ${gbp(nine.price_per_gram * 10)}. That is hallmarked weight only - stones, clasps and non-gold parts are excluded, and signed or antique pieces are often worth more than their weight.`
        : 'Multiply the hallmarked weight in grams by the 9ct rate in the table above. Stones, clasps and non-gold parts are excluded from the weight.',
    },
    {
      question: 'How much is 14ct (585) gold worth per gram?',
      answer: `14ct gold is 58.5% pure, so it is worth a little over half again what 9ct fetches per gram. Today that is ${live(fourteen, '14ct')}.`,
    },
    {
      question: 'How much is 18ct (750) gold worth per gram today?',
      answer: `18ct gold is 75% pure - exactly double 9ct - so it is worth twice as much per gram. Today that is ${live(eighteen, '18ct')}.`,
    },
    {
      question: 'How much is 22ct gold per gram?',
      answer: `22ct gold is 91.6% pure, the standard for sovereigns and most Asian gold jewellery. Today that is ${live(twentyTwo, '22ct')}. Sovereigns and other coins are often worth more than their weight, so we check them separately.`,
    },
    {
      question: 'Why is 9ct gold worth less per gram than 18ct or 22ct?',
      answer:
        '9ct gold is 37.5% pure gold; 18ct is 75% and 22ct is 91.6%. The per-gram price scales with purity, which is why a heavy 9ct chain can still be worth less than a light 22ct bangle. Every rate in our table is the purity-adjusted price we actually pay.',
    },
    {
      question: 'Is this the scrap gold price or the jewellery price?',
      answer:
        'The calculator shows our per-gram rate for gold sold by weight - what the trade calls the scrap rate. Signed, antique or gem-set pieces are often worth more than their weight, which is why every valuation is checked by a specialist before we quote: if your piece deserves jewellery pricing rather than metal pricing, we say so.',
    },
    {
      question: 'How is your rate different from the gold spot price?',
      answer:
        "The spot price is the wholesale market rate for pure 24ct gold. Our paying rate is the spot price adjusted for your item's purity, less a transparent margin that covers refining and our costs. We show the rate before anything is weighed - you can check it against the live spot price at any time.",
    },
    {
      question: 'How quickly do I get paid?',
      answer:
        'Within seconds. When you accept our figure in person - at the Ascot office or at your home - we send the money by instant bank transfer on the spot, and it normally shows in your account before the appointment is over. Cash is available for smaller sums. Pieces sent by insured post are paid by the same instant transfer on the day they arrive and are checked.',
    },
    {
      question: 'How do I sell after using the calculator?',
      answer:
        'Send photographs through the valuation form below for a written figure within one working day, book a private appointment at our Ascot office, or arrange a home visit. Once you accept, payment is by instant bank transfer within seconds.',
    },
  ];
}

export default async function GoldCalculatorPage() {
  const [rates, spots] = await Promise.all([getCalculatorRates(), getMetalSpots()]);

  const goldRates = rates.filter((r) => r.metal_type === 'Gold');
  const otherRates = rates.filter((r) => r.metal_type !== 'Gold');
  const nineCt = findGold(rates, 9);
  const eighteenCt = findGold(rates, 18);
  const twentyTwoCt = findGold(rates, 22);
  const faqs = buildFaqs(rates);
  const refreshed = spots.fetched_at ? formatDateTimeGB(spots.fetched_at) : null;

  const heading = nineCt
    ? `9ct Gold Price Per Gram Today: ${gbp(nineCt.price_per_gram)}`
    : 'Gold Price Per Gram Today';
  const subhead = `Live UK rates for 9ct, 14ct, 18ct and 22ct gold${refreshed ? `, refreshed ${refreshed}` : ''}. Enter your weights in grams for an instant guide price. Sell in person and you are paid by instant bank transfer within seconds of accepting.`;

  return (
    <>
      <JsonLd data={[locationFaqSchema(faqs)]} />

      {/* GoldCalculator acts as the page hero - its title renders as <h1>,
          carrying today's 9ct figure so the heading answers the search. */}
      <GoldCalculator rates={rates} asH1 heading={heading} subhead={subhead} />

      {/* Crawlable price table - the calculator itself is interactive, so the
          per-gram rates are repeated here as plain HTML for search engines
          (and anyone who just wants today's number without typing). */}
      {rates.length > 0 && (
        <section className="py-8 lg:py-12 border-y border-gold-metallic/15 bg-ink-900/40">
          <div className="gc-container max-w-4xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="gc-eyebrow">
                {refreshed ? `Rates refreshed ${refreshed}` : 'Updated Throughout The Day'}
              </span>
              <h2 className="gc-heading mt-3">Today&rsquo;s Gold Price Per Gram, UK</h2>
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
                    <th className="py-3 pr-4 font-semibold">Hallmark</th>
                    <th className="py-3 pr-4 font-semibold">Purity</th>
                    <th className="py-3 text-right font-semibold">We pay per gram</th>
                  </tr>
                </thead>
                <tbody>
                  {[...goldRates, ...otherRates].map((r) => (
                    <tr key={r.id} className="border-b border-gold-metallic/10 text-warmgrey">
                      <td className="py-3 pr-4 font-medium text-white">
                        {r.metal_type === 'Gold'
                          ? `${r.carat_label} gold`
                          : `${r.metal_type} (${r.carat_label})`}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">{stamp(r.purity_percentage)}</td>
                      <td className="py-3 pr-4">{r.purity_percentage}%</td>
                      <td className="py-3 text-right font-semibold text-gold-bright">
                        Up to {gbp(r.price_per_gram)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nineCt && (
              <div className="mx-auto mt-10 max-w-3xl">
                <h3 className="font-display text-lg font-semibold text-white">
                  What 9ct gold is worth at today&rsquo;s rate
                </h3>
                <p className="mt-1 text-sm text-warmgrey">
                  {gbp(nineCt.price_per_gram)} per gram, hallmarked weight only.
                </p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 4, 5, 6, 10, 20, 44, 50, 100].map((grams) => (
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
              </div>
            )}

            {(eighteenCt || twentyTwoCt) && (
              <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
                {[
                  { label: '18ct', rate: eighteenCt },
                  { label: '22ct', rate: twentyTwoCt },
                ].map(({ label, rate }) =>
                  rate ? (
                    <div key={label}>
                      <h3 className="font-display text-base font-semibold text-white">
                        {label} gold at {gbp(rate.price_per_gram)} per gram
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {[5, 10, 20].map((grams) => (
                          <li
                            key={grams}
                            className="flex items-baseline justify-between rounded-xl border border-gold-metallic/20 bg-ink-900/60 px-4 py-2.5 text-sm"
                          >
                            <span className="text-warmgrey">
                              {grams}g of {label} gold
                            </span>
                            <span className="font-semibold text-gold-bright">
                              ≈ {gbp(rate.price_per_gram * grams)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            )}

            <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-gold-metallic/30 bg-gold-metallic/10 px-5 py-4 text-center">
              <p className="font-display text-lg font-semibold text-gold-bright">
                Paid within seconds, not days
              </p>
              <p className="mt-1 text-sm text-warmgrey">
                Accept our figure at the Ascot office or at your home and the money is sent by
                instant bank transfer while you are still at the table - it is usually in your
                account before you leave. No fees, no waiting, no obligation to sell.
              </p>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-xs leading-relaxed text-warmgrey/70">
              Guide figures at today&rsquo;s paying rates. Stones and non-gold parts are excluded
              from the weight, and signed or antique pieces are often worth more than their weight,
              which is why every piece is checked by a specialist before we quote.{' '}
              <Link href="/sell-gold" className="text-gold-tint hover:text-gold-bright">
                How selling gold works
              </Link>
              {' · '}
              <Link href="/locations" className="text-gold-tint hover:text-gold-bright">
                Areas we cover
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* FAQ - mirrors the "9ct gold price" search phrasings from Search Console. */}
      <section className="py-8 lg:py-12">
        <div className="gc-container max-w-3xl">
          <span className="gc-eyebrow">Gold Prices - Frequently Asked</span>
          <h2 className="gc-heading mt-3">9ct, 14ct, 18ct and 22ct gold prices, explained</h2>
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

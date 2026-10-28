import type { Metadata } from 'next';
import Link from 'next/link';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { getGoldPriceHistory, recordGoldSnapshot } from '@/lib/queries/goldPriceHistory';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { getMetalSpots } from '@/lib/services/metalPrice';
import { formatDateTimeGB } from '@/lib/format';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { GoldPriceChart } from '@/components/public/GoldPriceChart';
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

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

/**
 * The page is built for one search family: "9ct gold price per gram",
 * "9ct gold price uk" and "price of 9ct gold per gram today". Search Console
 * (Sep to Oct 2026) had it at position 10 for the weight questions and 37 to
 * 47 for those head terms, so the title and H1 now carry the head term and
 * the page gained a 30/90 day chart of what we pay. No pence in the title or
 * the subhead (Paul, 12 Sep 2026): the figures live in the body.
 */
export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadata('/gold-calculator');
  const title = "9ct Gold Price Per Gram UK, Today's Rate | Charters Gold";
  const description =
    'Today\'s 9ct gold price per gram, with 18ct and 22ct, and a 90-day chart of what we pay. Enter your weight for a guide figure, then sell in person and be paid the same day, usually within seconds.';
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
 * Search Console; answers carry today's figures where they exist. Every
 * figure is what we pay today, never a market or spot rate, and no answer
 * talks about other buyers.
 */
function buildFaqs(
  rates: CalculatorRate[],
  trend: { first: { date: string; price: number }; last: { date: string; price: number } } | null,
) {
  const nine = findGold(rates, 9);
  const fourteen = findGold(rates, 14);
  const eighteen = findGold(rates, 18);
  const twentyTwo = findGold(rates, 22);
  const live = (r: CalculatorRate | undefined, label: string) =>
    r ? `${gbp(r.price_per_gram)} per gram for ${label}` : `the ${label} rate shown in the table above`;

  const trendFaq = trend
    ? {
        question: 'Has the 9ct gold price per gram gone up or down this month?',
        answer: (() => {
          const diff = trend.last.price - trend.first.price;
          const pct = Math.abs((diff / trend.first.price) * 100).toFixed(1);
          const dir = diff >= 0 ? 'up' : 'down';
          return `${dir === 'up' ? 'Up' : 'Down'}. On ${shortDate(trend.first.date)} we were paying ${gbp(trend.first.price)} per gram for 9ct gold and today we pay ${gbp(trend.last.price)}, ${dir} ${gbp(Math.abs(diff))} or ${pct}% in 30 days. The chart above shows every day in between, and you can switch it to 90 days.`;
        })(),
      }
    : null;

  return [
    {
      question: 'How much is 9ct gold worth per gram today?',
      answer: nine
        ? `Today we are paying ${gbp(nine.price_per_gram)} per gram for 9ct gold. What we pay is updated on this page through the day as gold moves. Enter your weight in the calculator above for an instant total, or read it off the table.`
        : 'What we pay is updated on this page through the day as gold moves. Enter the carat and weight in the calculator above for an instant figure.',
    },
    ...(trendFaq ? [trendFaq] : []),
    {
      question: 'What is the 9ct gold price per gram in the UK today, and why does it change?',
      answer:
        'Gold is priced in dollars per troy ounce and moves all day. The pound moves against the dollar too. 9ct gold is 37.5% pure, so the 9ct figure is 37.5% of the pure gold figure, less our refining cost. That is why what we pay on a Monday can be different by Friday. Today\'s figure is in the table above with the time it was last updated, and the chart shows the last 30 or 90 days.',
    },
    {
      question: 'What is 375 gold, and is it the same as 9ct?',
      answer:
        'Yes. 375 is the hallmark stamp for 9ct gold: 375 parts per thousand, or 37.5% pure. In the same way 585 is 14ct, 750 is 18ct and 916 is 22ct. If your piece is stamped 375 you can read its price straight off the 9ct row above.',
    },
    {
      question: 'How much is 10 grams of 9ct gold worth?',
      answer: nine
        ? `At what we pay today, 10 grams of 9ct gold is worth about ${gbp(nine.price_per_gram * 10)}. That is hallmarked gold weight only. Stones, clasps and non-gold parts are excluded, and signed or antique pieces are often worth more than their weight.`
        : 'Multiply the hallmarked weight in grams by the 9ct rate in the table above. Stones, clasps and non-gold parts are excluded from the weight.',
    },
    {
      question: 'How much is 14ct (585) gold worth per gram?',
      answer: `14ct gold is 58.5% pure, so it is worth a little over half again what 9ct fetches per gram. Today we pay ${live(fourteen, '14ct')}.`,
    },
    {
      question: 'How much is 18ct (750) gold worth per gram today?',
      answer: `18ct gold is 75% pure, exactly double 9ct, so it is worth twice as much per gram. Today we pay ${live(eighteen, '18ct')}. See the 18ct section above for what common weights come to.`,
    },
    {
      question: 'How much is 22ct gold per gram?',
      answer: `22ct gold is 91.6% pure, the standard for sovereigns and most Asian gold jewellery. Today we pay ${live(twentyTwo, '22ct')}. Sovereigns and other coins are often worth more than their weight, so we check them separately.`,
    },
    {
      question: 'Why is 9ct gold worth less per gram than 18ct or 22ct?',
      answer:
        '9ct gold is 37.5% pure gold; 18ct is 75% and 22ct is 91.6%. The per-gram price scales with purity, which is why a heavy 9ct chain can still be worth less than a light 22ct bangle. Every rate in our table is the purity-adjusted price we actually pay.',
    },
    {
      question: 'Is this the scrap gold price or the jewellery price?',
      answer:
        'The calculator shows our per-gram rate for gold sold by weight, what the trade calls the scrap rate. Signed, antique or gem-set pieces are often worth more than their weight, which is why every valuation is checked by a specialist before we quote: if your piece deserves jewellery pricing rather than metal pricing, we say so.',
    },
    {
      question: 'How is what you pay different from the gold spot price?',
      answer:
        'The spot price is for pure 24ct gold in wholesale quantities. What we pay follows it through the day, adjusted for the purity of your piece and our refining cost, so 9ct, 18ct and 22ct each have their own figure. The figure on this page is the one on the scales when you sell.',
    },
    {
      question: 'How quickly do I get paid?',
      answer:
        'The same day, and usually within seconds. When you accept our figure in person, at the Ascot office or at your home, we send the money by instant bank transfer on the spot, and it normally shows in your account before the appointment is over. Cash is available for smaller sums. Pieces sent by insured post are paid by the same instant transfer on the day they arrive and are checked.',
    },
    {
      question: 'How do I sell after using the calculator?',
      answer:
        'Send photographs through the valuation form below for a written figure within one working day, book a private appointment at our Ascot office, or arrange a home visit. Once you accept, payment is by instant bank transfer the same day, usually within seconds.',
    },
  ];
}

export default async function GoldCalculatorPage() {
  const [rates, spots] = await Promise.all([getCalculatorRates(), getMetalSpots()]);
  // Today's row for the chart. Cheap and never throws; see goldPriceHistory.ts.
  await recordGoldSnapshot(rates);
  const history = await getGoldPriceHistory(rates, 9, 90);

  const goldRates = rates.filter((r) => r.metal_type === 'Gold');
  const otherRates = rates.filter((r) => r.metal_type !== 'Gold');
  const nineCt = findGold(rates, 9);
  const eighteenCt = findGold(rates, 18);
  const twentyTwoCt = findGold(rates, 22);
  const twentyFourCt = findGold(rates, 24);

  const since30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const last30 = history.points.filter((p) => p.date >= since30);
  const trend =
    last30.length >= 2 ? { first: last30[0], last: last30[last30.length - 1] } : null;

  const faqs = buildFaqs(rates, trend);
  const refreshed = spots.fetched_at ? formatDateTimeGB(spots.fetched_at) : null;

  const heading = "9ct Gold Price Per Gram UK, Today's Rate";
  const subhead =
    'Enter your weights in grams and see what we would pay today for 9ct, 14ct, 18ct and 22ct gold. What we pay is updated through the day as gold moves, and the chart below shows the last 90 days. Sell in person and you are paid by instant bank transfer the same day, usually within seconds of accepting.';

  return (
    <>
      <JsonLd data={[locationFaqSchema(faqs)]} />

      {/* GoldCalculator acts as the page hero - its title renders as <h1>. */}
      <GoldCalculator
        rates={rates}
        asH1
        heading={heading}
        subhead={subhead}
        ctaHref="#valuation-form"
      />

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
              <h2 className="gc-heading mt-3">The Gold Price Per Gram We Pay Today, in Seconds</h2>
              <p className="gc-subhead mt-4">
                The rates below are what we pay today per gram, adjusted for purity. They are
                updated through the day as gold moves. No testing fees and no deductions on the
                day: the rate you see is the rate on the scales.
              </p>
            </div>

            <div className="mx-auto mt-8 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gold-metallic/30 text-left text-[11px] uppercase tracking-luxe text-gold-tint">
                    <th className="py-3 pr-4 font-semibold">Metal &amp; carat</th>
                    <th className="py-3 pr-4 font-semibold">Hallmark</th>
                    <th className="py-3 pr-4 font-semibold">Purity</th>
                    <th className="py-3 text-right font-semibold">We pay today, per gram</th>
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
                        {gbp(r.price_per_gram)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nineCt && (
              <div className="mx-auto mt-10 max-w-3xl">
                <h3 className="font-display text-lg font-semibold text-white">
                  What your 9ct gold gets you today, paid in seconds
                </h3>
                <p className="mt-1 text-sm text-warmgrey">
                  We pay {gbp(nineCt.price_per_gram)} per gram today on hallmarked gold, and on
                  unhallmarked gold once tested. Gold weight only, stones and clasps excluded.
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

            <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-gold-metallic/30 bg-gold-metallic/10 px-5 py-4 text-center">
              <p className="font-display text-lg font-semibold text-gold-bright">
                Paid the same day, usually within seconds
              </p>
              <p className="mt-1 text-sm text-warmgrey">
                Accept our figure at the Ascot office or at your home and the money is sent by
                instant bank transfer while you are still at the table. It is usually in your
                account before you leave. No fees, no waiting, no obligation to sell.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 30 / 90 DAY CHART - the one thing "9ct gold price uk" searchers want
          that today's figure alone does not give them. */}
      {history.points.length >= 2 && (
        <section className="py-8 lg:py-12 border-b border-gold-metallic/15" id="price-chart">
          <div className="gc-container max-w-4xl">
            <div className="mx-auto max-w-3xl">
              <span className="gc-eyebrow">9ct gold price per gram, last 90 days</span>
              <h2 className="gc-heading mt-3">Where the 9ct gold price has been</h2>
              <p className="mt-4 text-base leading-relaxed text-warmgrey">
                This is what we have been paying per gram for 9ct gold, day by day. Gold is
                priced around the clock on weekdays and stands still at weekends, so you will see
                flat steps from Friday night to Monday morning. If you are deciding whether to sell
                now or wait, this is the honest picture: nobody can tell you where it goes next,
                but you can see where it has been.
              </p>
            </div>
            <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-gold-metallic/20 bg-ink-900/60 p-4 sm:p-6">
              <GoldPriceChart points={history.points} carat="9ct" defaultRange={90} />
            </div>
            <p className="mx-auto mt-3 max-w-3xl text-xs leading-relaxed text-warmgrey/70">
              {history.source === 'snapshots'
                ? 'One reading a day, taken from the rate shown on this page.'
                : 'Daily figures worked back from the pure gold price at our paying rate today.'}{' '}
              Every point is what we pay for hallmarked 9ct gold by weight, not a market quote.
            </p>
          </div>
        </section>
      )}

      {/* 18ct and 22ct - their own sections, because "18ct gold price per gram"
          and "22ct gold price per gram" are searches in their own right. */}
      {(eighteenCt || twentyTwoCt) && (
        <section className="py-8 lg:py-12 border-b border-gold-metallic/15 bg-ink-900/40">
          <div className="gc-container max-w-4xl">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
              {eighteenCt && (
                <div id="18ct">
                  <span className="gc-eyebrow">18ct gold, hallmark 750</span>
                  <h2 className="gc-heading mt-3">18ct Gold Price Per Gram Today</h2>
                  <p className="mt-4 text-sm leading-relaxed text-warmgrey">
                    18ct gold is 75% pure, so a gram of 18ct is worth exactly twice a gram of 9ct.
                    It is the usual carat for better rings, bracelets and continental chains, and
                    it is stamped 750. Today we pay{' '}
                    <strong className="text-gold-bright">{gbp(eighteenCt.price_per_gram)} per gram</strong>{' '}
                    for 18ct gold by weight. An 18ct ring with a diamond is weighed without the
                    stone and often worth more as a ring than as gold, so we check before we quote.
                  </p>
                  <ul className="mt-4 space-y-2">
                    {[2, 5, 10, 20, 50].map((grams) => (
                      <li
                        key={grams}
                        className="flex items-baseline justify-between rounded-xl border border-gold-metallic/20 bg-ink-900/60 px-4 py-2.5 text-sm"
                      >
                        <span className="text-warmgrey">{grams}g of 18ct gold</span>
                        <span className="font-semibold text-gold-bright">
                          ≈ {gbp(eighteenCt.price_per_gram * grams)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {twentyTwoCt && (
                <div id="22ct">
                  <span className="gc-eyebrow">22ct gold, hallmark 916</span>
                  <h2 className="gc-heading mt-3">22ct Gold Price Per Gram Today</h2>
                  <p className="mt-4 text-sm leading-relaxed text-warmgrey">
                    22ct gold is 91.6% pure, the standard for Asian wedding sets, bangles and
                    chains, and for gold sovereigns. It is stamped 916, or sometimes not at all.
                    Today we pay{' '}
                    <strong className="text-gold-bright">{gbp(twentyTwoCt.price_per_gram)} per gram</strong>{' '}
                    for 22ct gold by weight. A full sovereign weighs 7.98 grams, of which 7.32
                    grams is pure gold, and coins are checked separately because many are worth
                    more than their weight.
                    {twentyFourCt && (
                      <>
                        {' '}
                        24ct coins and bars are paid at {gbp(twentyFourCt.price_per_gram)} per
                        gram today.
                      </>
                    )}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {[5, 8, 10, 20, 50].map((grams) => (
                      <li
                        key={grams}
                        className="flex items-baseline justify-between rounded-xl border border-gold-metallic/20 bg-ink-900/60 px-4 py-2.5 text-sm"
                      >
                        <span className="text-warmgrey">{grams}g of 22ct gold</span>
                        <span className="font-semibold text-gold-bright">
                          ≈ {gbp(twentyTwoCt.price_per_gram * grams)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <p className="mx-auto mt-8 max-w-3xl text-xs leading-relaxed text-warmgrey/70">
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

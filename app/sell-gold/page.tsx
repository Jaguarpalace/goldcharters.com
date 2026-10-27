import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/lib/seo/JsonLd';
import {
  breadcrumbSchema,
  locationFaqSchema,
  serviceSchema,
  SITE_URL,
} from '@/lib/seo/structuredData';
import { getSiteSettings } from '@/lib/queries/homepage';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { getAllLocationSlugs, getLocationBySlug } from '@/lib/content/locations';
import { formatUkPhone } from '@/lib/format';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { ValuationForm } from '@/components/public/ValuationForm';
import { ReviewsBlock } from '@/components/public/ReviewsBlock';
import { GetValuationLink } from '@/components/public/GetValuationLink';
import { TrackedLink } from '@/components/public/TrackedLink';
import type { CalculatorRate } from '@/types/database';

export const revalidate = 120;

/**
 * /sell-gold - rebuilt 27 Oct 2026.
 *
 * The old page was six homepage blocks stacked up with no copy of its own,
 * and Search Console had it at position 39 for "sell gold". This version is
 * written in the Chertsey voice (plain spoken, short sentences, the money
 * phrases inside sentences that tell the reader something) and its FAQs are
 * the questions people actually typed: sell scrap gold, sell old gold, sell
 * gold for cash, best place to sell gold, sell gold near me, gold buyers.
 * Figures on the page are "what we pay today" (never live/market rate) and
 * never appear in the title or description.
 */

const gbp = (n: number) =>
  n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });

const findGold = (rates: CalculatorRate[], carat: number) =>
  rates.find(
    (r) => r.metal_type === 'Gold' && new RegExp(`^\\s*${carat}\\s*ct`, 'i').test(r.carat_label),
  );

const stamp = (purity: number) => Math.round(purity * 10).toString().padStart(3, '0');

export async function generateMetadata(): Promise<Metadata> {
  const base = await buildPageMetadata('/sell-gold');
  const title = 'Sell Gold for Cash - Paid in Seconds | Charters Gold';
  const description =
    'Sell gold, scrap gold, old jewellery, coins and bars to private gold buyers in Ascot. Tested and weighed in front of you, paid the same day by instant transfer or cash.';
  return {
    ...base,
    title: { absolute: title },
    description,
    openGraph: { ...base.openGraph, title, description },
    twitter: { ...base.twitter, title, description },
  };
}

const WHAT_WE_BUY = [
  {
    title: 'Scrap gold and broken jewellery',
    body: 'Snapped chains, single earrings, bent rings, broken clasps, watch cases, dental gold. Scrap gold is worth the same per gram as a perfect piece of the same carat, so the condition makes no difference. Bring the whole tin.',
  },
  {
    title: 'Old gold and inherited jewellery',
    body: 'Rings, lockets, charm bracelets and chains that nobody wears any more. We read the hallmark, sort it by carat and pay for the gold in it. Older 15ct gold, stamped 625, is worth more than most people think.',
  },
  {
    title: 'Gold jewellery you still wear',
    body: 'Good jewellery is checked for more than its weight first. A signed ring, a good diamond or an older piece in original condition is priced for what it is, not by the gram.',
  },
  {
    title: 'Sovereigns, gold coins and bars',
    body: 'Full and half sovereigns, Krugerrands, Britannias and hallmarked bars from one gram up. Common coins are paid on their gold content. A rare date or mint mark is worth more as a coin, so please do not clean it.',
  },
  {
    title: '22ct and Asian gold',
    body: 'Bangles, sets, chains and coins in 22ct and 24ct. These are weighed and tested in front of you and paid at the 22ct and 24ct rate we pay today, which is the highest per gram.',
  },
  {
    title: 'Gold with no hallmark',
    body: 'Unmarked gold is tested free while you watch. If it is gold, you are paid for the carat the test shows. If it is not, we tell you straight and there is no charge for looking.',
  },
];

const STEPS = [
  {
    title: 'We read the hallmark and test it',
    body: 'Every piece is sorted by carat: 375 is 9ct, 585 is 14ct, 750 is 18ct, 916 is 22ct. Anything unmarked or doubtful is acid or XRF tested in front of you, free.',
  },
  {
    title: 'We weigh it where you can see the scales',
    body: 'Each carat is weighed separately on calibrated scales, in grams, and written down. Stones and non-gold parts are taken out of the weight. You see every number before we add it up.',
  },
  {
    title: 'You are paid the same day',
    body: 'Happy with the figure? Bigger sums go by instant bank transfer while you are still at the table, usually in your account within seconds. Cash for gold is available on smaller amounts. Not happy? You take it home. There is no fee either way.',
  },
];

const THREE_WAYS = [
  {
    title: 'Come to our office in Ascot',
    body: 'A private office near Ascot station, with parking close by. Open seven days a week by appointment, one customer at a time. We read the hallmarks, test anything unmarked, weigh it all in front of you and write the figure down.',
  },
  {
    title: 'We come to your home',
    body: 'By appointment across Berkshire, Surrey and west London, usually within the week. We show ID on arrival, family are welcome to sit in, and you get a written note before anything leaves your hands. Paid at your table.',
  },
  {
    title: 'Send it by Special Delivery',
    body: 'Royal Mail Special Delivery reaches us the next working day, tracked and signed for. We photograph everything on the scales when it arrives and call you the same day with a figure. Not happy? It goes straight back.',
  },
];

const WHY_US = [
  'A private office, one customer at a time. Nothing goes into a back room.',
  'We are gold buyers, not a shop. There is nothing to sell you and no part exchange.',
  'The rate per gram is shown before you decide, and written down for 24 hours.',
  'Paid the same day, usually within seconds, by instant transfer or cash.',
  'Seven days a week by appointment, weekends included.',
];

function buildFaqs(rates: CalculatorRate[]) {
  const nine = findGold(rates, 9);
  const eighteen = findGold(rates, 18);
  const twentyTwo = findGold(rates, 22);
  const live = (r: CalculatorRate | undefined, label: string) =>
    r ? `${gbp(r.price_per_gram)} per gram for ${label}` : `our ${label} rate on the gold calculator`;

  return [
    {
      question: 'Where is the best place to sell gold near me?',
      answer:
        'Somewhere that tests and weighs your gold in front of you, shows you the rate per gram before you decide, and pays you the same day. That is how we work. We are private gold buyers in Ascot, Berkshire, with customers from across Berkshire, Surrey and west London. Come to the office, ask for a home visit, or post smaller pieces. There is no fee and you do not have to sell.',
    },
    {
      question: 'How much do you pay for gold today?',
      answer: `It depends on the carat and the weight. Today we pay ${live(nine, '9ct')}, ${live(eighteen, '18ct')} and ${live(twentyTwo, '22ct')}. The rate moves with the gold market through the day, so check the gold calculator on the day you come. Weigh your gold on kitchen scales, pick the carat and you have a guide figure before you leave the house.`,
    },
    {
      question: 'Can I sell gold for cash?',
      answer:
        'Yes. For smaller amounts you can be paid in cash at the appointment. Bigger sums are paid by instant bank transfer while you are with us, which is usually in your account within seconds and gives you a record of the sale. Either way you are paid the same day, and never by cheque.',
    },
    {
      question: 'Do you buy scrap gold?',
      answer:
        'Yes. Scrap gold is simply gold that is bought for its metal: snapped chains, odd earrings, bent rings, old watch cases, dental gold, gold with no hallmark. It is paid by carat and weight, so a broken piece is worth the same per gram as a perfect one. Bring everything and we will sort out what is gold and what is not.',
    },
    {
      question: 'Can I sell old gold jewellery that is worn out or out of fashion?',
      answer:
        'Yes, and it is most of what we buy. Fashion makes no difference to the price per gram. Older jewellery is worth checking carefully though: 15ct gold stamped 625 has not been made since 1932, and Victorian, Edwardian and Art Deco pieces in original condition can be worth more than their weight. We look for that first.',
    },
    {
      question: 'How do I know what carat my gold is?',
      answer:
        'Look for the small stamp, usually inside a ring or on the clasp of a chain. 375 is 9ct, 585 is 14ct, 625 is 15ct, 750 is 18ct and 916 is 22ct. No stamp does not mean it is not gold. We test unmarked gold free while you watch.',
    },
    {
      question: 'Why is my gold worth less than I paid for it?',
      answer:
        'Because the shop price was never just the gold. A new ring is priced to cover the making, the shop and 20% VAT, and none of that comes back when you sell. What is left is the gold, and that is what gold buyers pay for. The exceptions are signed pieces, good diamonds and older jewellery, which we price for what they are.',
    },
    {
      question: 'Do you buy gold sovereigns and gold coins?',
      answer:
        'Yes. Sovereigns and half sovereigns are the gold coins we see most, often one coin left by a grandparent. We also buy Krugerrands, Britannias and gold bars. Common coins are paid on their gold content at the rate we pay that day. A rare date or mint mark is worth more as a coin, so please do not clean it first.',
    },
    {
      question: 'Can I sell gold chains, bracelets and rings?',
      answer:
        'Yes, all of them, in 9ct, 14ct, 18ct and 22ct. Chains and bracelets are usually bought by weight. Rings are checked for stones and signatures first, because a good diamond or a signed ring is worth more than its gold. Either way the figure is written down and valid for 24 hours.',
    },
    {
      question: 'Is it better to sell gold online or in person?',
      answer:
        'In person, if you can. You see your gold on the scales, you see the rate per gram, and you are paid before you leave. Posting gold means trusting a figure you cannot check. If you cannot get to Ascot, we come to your home across Berkshire, Surrey and west London by appointment, and smaller pieces can be sent by Royal Mail Special Delivery.',
    },
    {
      question: 'What do I need to bring to sell my gold?',
      answer:
        'Your gold, and one piece of photo ID such as a driving licence or passport. We record who we buy from on every sale, because it protects you and keeps stolen gold out of the trade. Receipts, boxes and certificates help with diamonds, watches and signed pieces, but you do not need them.',
    },
    {
      question: 'Can I sell gold for a parent or someone who has died?',
      answer:
        'Yes, as long as you have the right to sell it. Bring your own photo ID. If you have power of attorney, or you are the executor of a will, bring that paperwork too. A home visit often suits this best, because the owner can be in the room and nothing has to travel. We also do written valuations for probate.',
    },
    {
      question: 'Do you buy silver, platinum and watches as well as gold?',
      answer:
        'Yes. Sterling silver is paid by weight, platinum and palladium by purity, and watches on the model, condition and whether you still have the box and papers. Bring them with your gold and we will look at everything in one go.',
    },
  ];
}

export default async function SellGoldPage() {
  const [settings, rates] = await Promise.all([getSiteSettings(), getCalculatorRates()]);
  const headline = [
    { label: '9ct', rate: findGold(rates, 9) },
    { label: '14ct', rate: findGold(rates, 14) },
    { label: '18ct', rate: findGold(rates, 18) },
    { label: '22ct', rate: findGold(rates, 22) },
  ].filter((x): x is { label: string; rate: CalculatorRate } => Boolean(x.rate));
  const faqs = buildFaqs(rates);
  const towns = getAllLocationSlugs()
    .map((slug) => getLocationBySlug(slug))
    .filter((l): l is NonNullable<typeof l> => Boolean(l))
    .sort((a, b) => a.travel.distanceMiles - b.travel.distanceMiles);
  const phoneHref = `tel:${settings.phone.replace(/\D/g, '')}`;

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Sell Gold',
            description:
              'Private gold buyers in Ascot, Berkshire. Sell gold, scrap gold, old jewellery, sovereigns and bars. Tested and weighed in front of you, paid the same day.',
            url: `${SITE_URL}/sell-gold`,
            serviceType: 'Gold buying service',
          }),
          locationFaqSchema(faqs),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Gold', url: `${SITE_URL}/sell-gold` },
          ]),
        ]}
      />

      <nav aria-label="Breadcrumb" className="border-b border-gold-metallic/15">
        <div className="gc-container py-3 text-xs text-warmgrey">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-gold-tint">Home</Link>
            </li>
            <li aria-hidden className="text-gold-metallic/50">/</li>
            <li aria-current="page" className="text-gold-tint">Sell Gold</li>
          </ol>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-7 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Private gold buyers in Ascot, Berkshire</span>
            <h1 className="gc-heading-xl mt-3">Sell Gold for Cash, Paid in Seconds</h1>
            <p className="gc-subhead mt-5">
              Got gold to sell? Here is how it works. Bring it to our office in Ascot, or we come to
              your home across Berkshire, Surrey and west London. We read the hallmark, test anything
              unmarked, weigh it in grams in front of you and show you what we pay for that carat
              today. Happy with the figure? You are paid the same day, usually within seconds. Not
              happy? You take it home, and there is no fee either way. We buy scrap gold, broken
              chains, old rings, sovereigns and jewellery you no longer wear.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <GetValuationLink className="gc-btn-primary">Get a Valuation</GetValuationLink>
              <Link href="/gold-calculator" className="gc-btn-secondary">
                Today&rsquo;s Gold Price Per Gram
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* START STRIP */}
      <section className="border-b border-gold-metallic/15 bg-ink-900/60">
        <div className="gc-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-white">Start your gold valuation</p>
            <p className="text-[12px] text-warmgrey">
              Free, no obligation, two minutes to fill in. Paid the same day if you decide to sell.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <GetValuationLink className="gc-btn-primary whitespace-nowrap !px-4 !py-2 text-[12px]">
              Start your valuation
            </GetValuationLink>
            <TrackedLink
              event="phone_click"
              params={{ where: 'sell-gold-strip' }}
              href={phoneHref}
              className="whitespace-nowrap text-[12px] font-semibold uppercase tracking-luxe text-gold-tint hover:text-gold-bright"
            >
              or call {formatUkPhone(settings.phone)}
            </TrackedLink>
          </div>
        </div>
      </section>

      {/* WHAT WE PAY TODAY */}
      {headline.length > 0 && (
        <section className="border-b border-gold-metallic/15 py-8 lg:py-12">
          <div className="gc-container">
            <div className="mx-auto max-w-3xl text-center">
              <span className="gc-eyebrow">What we pay today</span>
              <h2 className="gc-heading mt-3">The gold price per gram we pay today</h2>
              <p className="mt-4 text-base leading-relaxed text-warmgrey">
                These are the rates on our scales today, per gram of hallmarked gold. They move with
                the gold market through the day. The same figures are on the gold calculator, so you
                can price your gold at home before you sell.
              </p>
            </div>
            <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {headline.map(({ label, rate }) => (
                <li
                  key={label}
                  className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 px-5 py-4 text-center"
                >
                  <p className="text-[11px] uppercase tracking-luxe text-gold-tint">
                    {label} gold{' '}
                    <span className="font-mono text-warmgrey">({stamp(rate.purity_percentage)})</span>
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-gold-bright">
                    {gbp(rate.price_per_gram)}
                  </p>
                  <p className="mt-1 text-xs text-warmgrey">per gram today</p>
                </li>
              ))}
            </ul>
            <p className="mx-auto mt-5 max-w-3xl text-center text-xs text-warmgrey/70">
              Gold weight only, stones and clasps excluded. Signed, antique and gem-set pieces are
              checked first because they are often worth more than their weight.{' '}
              <Link href="/gold-calculator" className="text-gold-tint hover:text-gold-bright">
                Work out your figure on the gold calculator
              </Link>
              .
            </p>
          </div>
        </section>
      )}

      {/* WHAT WE BUY */}
      <section className="border-b border-gold-metallic/15 bg-ink-900/40 py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Gold buyers for any gold, in any condition</span>
            <h2 className="gc-heading mt-3">What gold we buy</h2>
            <p className="mt-4 text-base leading-relaxed text-warmgrey">
              Any gold, in 9ct, 14ct, 15ct, 18ct, 22ct and 24ct. Hallmarked or not, broken or
              perfect, one ring or a whole drawer. If you are not sure whether something is gold,
              bring it anyway. Testing is free and we tell you straight.
            </p>
          </div>
          <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_BUY.map((item) => (
              <li key={item.title} className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5">
                <h3 className="font-display text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgrey">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* HOW WE PRICE IT */}
      <section className="border-b border-gold-metallic/15 py-8 lg:py-12">
        <div className="gc-container">
          <div className="grid gap-8 lg:grid-cols-[1fr,1.4fr] lg:gap-12">
            <aside className="gc-card gc-card-gold-edge h-fit p-6 lg:sticky lg:top-28">
              <p className="text-xs font-semibold uppercase tracking-luxe text-gold-metallic">
                Why people sell gold to us
              </p>
              <ul className="mt-4 space-y-3 text-sm text-warmgrey">
                {WHY_US.map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full"
                      style={{ background: 'linear-gradient(135deg, #A67C00, #D4AF37, #FFD700, #B8860B)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#050505" strokeWidth="2.4">
                        <path d="M2 7.5L5 10.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </aside>
            <div>
              <span className="gc-eyebrow">How we work out the price</span>
              <h2 className="gc-heading mt-3">You see the scales and you see the sum</h2>
              <ul className="mt-6 space-y-5">
                {STEPS.map((step, idx) => (
                  <li key={step.title} className="rounded-xl border border-gold-metallic/15 bg-ink-900/40 p-5">
                    <h3 className="font-display text-lg font-semibold text-white">
                      {idx + 1}. {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-warmgrey">{step.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* THREE WAYS */}
      <section className="border-b border-gold-metallic/15 bg-ink-900/40 py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Three ways to sell your gold</span>
            <h2 className="gc-heading mt-3">In Ascot, at your home, or by post</h2>
          </div>
          <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-3">
            {THREE_WAYS.map((opt, idx) => (
              <li key={opt.title} className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5">
                <h3 className="font-display text-base font-semibold text-white">
                  {idx + 1}. {opt.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgrey">{opt.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CALCULATOR */}
      <GoldCalculator rates={rates} ctaHref="#valuation-form" />

      {/* FAQ */}
      <section className="border-y border-gold-metallic/15 bg-ink-900/40 py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl">
            <span className="gc-eyebrow">Selling gold - frequently asked</span>
            <h2 className="gc-heading mt-3">Straight answers before you sell your gold</h2>
            <ul className="mt-6 space-y-3">
              {faqs.map((f) => (
                <li key={f.question} className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5">
                  <h3 className="font-display text-base font-semibold text-white">{f.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-warmgrey">{f.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* WHERE */}
      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Gold buyers near you</span>
            <h2 className="gc-heading mt-3">Where we buy gold</h2>
            <p className="mt-4 text-base leading-relaxed text-warmgrey">
              Our office is in Ascot. Most of our customers come from the towns below, in person or
              by a home visit. Each page has the route, the areas we cover and the questions people
              there ask.
            </p>
          </div>
          <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2">
            {towns.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/locations/${t.slug}`}
                  className="inline-flex items-center rounded-full border border-gold-metallic/25 bg-ink-900/50 px-3.5 py-1.5 text-[12px] text-warmgrey transition hover:border-gold-metallic hover:text-gold-bright"
                >
                  Sell gold in {t.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ReviewsBlock />

      <section className="border-t border-gold-metallic/15 py-8 lg:py-12" id="valuation-form">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Get a price for your gold</span>
            <h2 className="gc-heading mt-3">Request a Private Valuation</h2>
            <p className="gc-subhead mt-4">
              Send us a few photos and we will reply within one working day with a guide figure.
              Then book a time at our Ascot office, weekends included, or ask for a home visit.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <ValuationForm variant="metal" defaultItemType="gold" />
          </div>
        </div>
      </section>
    </>
  );
}

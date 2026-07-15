import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/lib/seo/JsonLd';
import {
  breadcrumbSchema,
  locationFaqSchema,
  serviceSchema,
  SITE_URL,
} from '@/lib/seo/structuredData';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { ValuationForm } from '@/components/public/ValuationForm';
import { HowItWorks } from '@/components/public/HowItWorks';

export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/sell-antique-jewellery');
}

/**
 * Targets the antique/vintage query cluster from Search Console ("sell
 * antique ring", "selling vintage jewellery", "sell antique jewellery
 * surrey"). Deliberately distinct from /sell-jewellery, which owns the
 * modern/designer angle — the two cross-link so search engines read them
 * as siblings, not rivals.
 */

const ERAS = [
  {
    era: 'Georgian (1714–1837)',
    body: 'Closed-back settings, foiled stones, cannetille work. Genuinely scarce - almost always worth more than its metal, and frequently mispriced by weight-only buyers.',
  },
  {
    era: 'Victorian (1837–1901)',
    body: 'Mourning jewellery, lockets, snake motifs, garnet and turquoise pieces. Condition and completeness drive value; original cases help.',
  },
  {
    era: 'Edwardian & Belle Époque (1901–1915)',
    body: 'Platinum lacework, old-cut diamonds, bows and garlands. Old European and mine-cut stones are valued as period cuts - never priced as if awaiting a re-cut.',
  },
  {
    era: 'Art Deco (1920s–1930s)',
    body: 'Geometric platinum and white gold, calibré-cut sapphires, emeralds and onyx. The most sought-after period in today’s market - signed pieces especially.',
  },
  {
    era: 'Mid-century & Retro (1940s–1960s)',
    body: 'Bold rose and yellow gold, cocktail rings, tank bracelets. Rising fast at auction as collectors move beyond Deco.',
  },
  {
    era: 'Signed pieces - any era',
    body: 'Cartier, Van Cleef & Arpels, Boucheron, Asprey, Garrard, Boodles. A signature can multiply value several times over; we verify marks and price against current auction results.',
  },
];

const FAQS = [
  {
    question: 'How is antique jewellery valued differently from scrap gold?',
    answer:
      'Scrap pricing pays for metal weight alone. Antique pieces carry additional value in their period, craftsmanship, stones, signatures and provenance - an Art Deco diamond ring can be worth several times its melt value. We assess every piece as jewellery first and only ever price as metal when the honest market supports nothing more, and we tell you which basis we are using and why.',
  },
  {
    question: 'Should I clean or repair a piece before selling it?',
    answer:
      'No - please don’t. Polishing removes original surfaces, amateur repairs are visible to any specialist, and both usually reduce value, sometimes substantially. Bring or send the piece exactly as it is, dust and all. Honest wear is expected in period pieces; erased history is not.',
  },
  {
    question: 'I’ve inherited jewellery and have no idea what any of it is - can you help?',
    answer:
      'This is the most common way we meet antique pieces. Bring the whole box, or have us visit: we identify each piece, explain what it is and what it is worth, and put it in writing - piece by piece, no charge, no obligation. Where something would genuinely do better at auction, we say so.',
  },
  {
    question: 'Do old or damaged pieces still have value?',
    answer:
      'Often, yes. A Georgian ring missing a stone or a Victorian locket with a dented case can still carry meaningful collector value, and even honest wear rarely erases a signed piece’s worth. Never discard or break up old jewellery before a specialist has seen it.',
  },
  {
    question: 'What paperwork or provenance helps the price?',
    answer:
      'Original cases and boxes, receipts, old insurance valuations, photographs of the piece being worn, family letters mentioning it - anything that anchors age and ownership. Provenance can add materially to value, particularly for signed and Victorian-or-earlier pieces, but its absence never prevents a fair valuation.',
  },
];

export default function SellAntiqueJewelleryPage() {
  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Sell Antique & Vintage Jewellery UK',
            description:
              'Specialist buying of antique, vintage and inherited jewellery - Georgian to mid-century, signed and unsigned - valued on period, craftsmanship and provenance rather than scrap weight.',
            url: `${SITE_URL}/sell-antique-jewellery`,
            serviceType: 'Antique jewellery valuation service',
          }),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Antique & Vintage Jewellery', url: `${SITE_URL}/sell-antique-jewellery` },
          ]),
          locationFaqSchema(FAQS),
        ]}
      />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-gold-metallic/15">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950" />
        <div className="gc-container relative py-7 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Antique &amp; Vintage Specialists</span>
            <h1 className="gc-heading-xl mt-3">Sell Antique &amp; Vintage Jewellery</h1>
            <p className="gc-subhead mt-5">
              Georgian to mid-century, signed or unsigned, pristine or imperfect - antique
              jewellery deserves a specialist eye, not a scrap scale. We value period pieces on
              their craftsmanship, stones and provenance, and pay the same day you accept.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="#valuation-form" className="gc-btn-primary">
                Get a Valuation
              </Link>
              <Link href="/sell-jewellery" className="gc-btn-secondary">
                Selling Modern Jewellery?
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WHY NOT SCRAP */}
      <section className="py-8 lg:py-12">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl">
            <span className="gc-eyebrow">Why period pieces are different</span>
            <h2 className="gc-heading mt-3">Never sell an antique by weight</h2>
            <div className="mt-5 space-y-4 text-sm leading-relaxed text-warmgrey">
              <p>
                A gold counter sees a Victorian locket as grams of 15ct gold. A specialist sees a
                dated hallmark, a hand-engraved case, an intact glass compartment - and a
                collectors&rsquo; market that pays for all three. The difference between the two
                figures is often the entire value of the piece.
              </p>
              <p>
                Our valuations start from what a piece <em>is</em>: its era, maker, materials,
                stones and condition, checked against current auction results for comparable
                pieces. Only when a piece genuinely carries no premium beyond its metal do we
                price it that way - and we explain the basis of every figure before anything is
                agreed. If we believe a piece would achieve more at auction, we tell you that
                too.
              </p>
              <p>
                Wondering what the metal alone is worth as a floor price? Our{' '}
                <Link href="/gold-calculator" className="text-gold-metallic underline underline-offset-2 hover:text-gold-bright">
                  gold calculator shows today&rsquo;s price per gram
                </Link>{' '}
                - a period piece should always be worth at least that, and usually more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ERA GUIDE */}
      <section className="py-8 lg:py-12 border-y border-gold-metallic/15 bg-ink-900/40">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">From Georgian to Retro</span>
            <h2 className="gc-heading mt-3">The eras we buy, and what to look for</h2>
          </div>
          <ul className="mx-auto mt-8 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ERAS.map((e) => (
              <li key={e.era} className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5">
                <h3 className="font-display text-base font-semibold text-white">{e.era}</h3>
                <p className="mt-2 text-sm leading-relaxed text-warmgrey">{e.body}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-warmgrey/70">
            Also: mourning and sentimental jewellery, micro-mosaics, cameos, old-cut diamond
            rings, vintage watches, and inherited pieces of unknown age - identification is part
            of the valuation.
          </p>
        </div>
      </section>

      <HowItWorks />

      {/* FAQ */}
      <section className="py-8 lg:py-12 border-y border-gold-metallic/15 bg-ink-900/40">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl">
            <span className="gc-eyebrow">Antique Jewellery - Frequently Asked</span>
            <h2 className="gc-heading mt-3">Selling period pieces, answered</h2>
            <ul className="mt-6 space-y-3">
              {FAQS.map((f) => (
                <li key={f.question} className="rounded-xl border border-gold-metallic/20 bg-ink-900/60 p-5">
                  <h3 className="font-display text-base font-semibold text-white">{f.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-warmgrey">{f.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="jewellery" defaultItemType="jewellery" />
        </div>
      </section>
    </>
  );
}

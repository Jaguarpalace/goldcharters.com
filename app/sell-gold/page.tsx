import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/JsonLd';
import { breadcrumbSchema, serviceSchema, SITE_URL } from '@/lib/seo/structuredData';
import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { getItemsWeBuy } from '@/lib/queries/items';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { SellSection } from '@/components/public/SellSection';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { ItemsWeBuy } from '@/components/public/ItemsWeBuy';
import { ValuationForm } from '@/components/public/ValuationForm';
import { HowItWorks } from '@/components/public/HowItWorks';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/sell-gold');
}

export default async function SellGoldPage() {
  const [sections, rates, items] = await Promise.all([
    getHomepageSections(),
    getCalculatorRates(),
    getItemsWeBuy(),
  ]);

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Sell Gold UK',
            description:
              'Sell gold rings, chains, bracelets, coins, bars and scrap gold to a discreet UK private valuation house. Same-day payment available.',
            url: `${SITE_URL}/sell-gold`,
            serviceType: 'Gold buying service',
          }),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Gold', url: `${SITE_URL}/sell-gold` },
          ]),
        ]}
      />
      {/* SellSection acts as the page hero — title renders as <h1>. */}
      <SellSection section={findHomepageSection(sections, 'sell_intro')} variant="gold" asH1 />
      <GoldCalculator rates={rates} />
      <ItemsWeBuy items={items} />
      <HowItWorks />
      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="metal" defaultItemType="gold" />
        </div>
      </section>
    </>
  );
}

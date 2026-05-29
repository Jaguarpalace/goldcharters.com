import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/JsonLd';
import { breadcrumbSchema, serviceSchema, SITE_URL } from '@/lib/seo/structuredData';
import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { getItemsWeBuy } from '@/lib/queries/items';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { SellSection } from '@/components/public/SellSection';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { CalculatorSpotBadge } from '@/components/public/CalculatorSpotBadge';
import { ItemsWeBuy } from '@/components/public/ItemsWeBuy';
import { ValuationForm } from '@/components/public/ValuationForm';
import { HowItWorks } from '@/components/public/HowItWorks';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/sell-silver');
}

export default async function SellSilverPage() {
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
            name: 'Sell Silver UK',
            description:
              'Sell sterling silver, silver coins, bars, scrap silver and hallmarked pieces to a discreet UK private valuation house. Same-day payment available.',
            url: `${SITE_URL}/sell-silver`,
            serviceType: 'Silver buying service',
          }),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Silver', url: `${SITE_URL}/sell-silver` },
          ]),
        ]}
      />
      {/* SellSection acts as the page hero - title renders as <h1>. */}
      <SellSection section={findHomepageSection(sections, 'silver_intro')} variant="gold" asH1 />
      {/* Silver-specific live spot badge above the calculator. */}
      <section className="relative py-6 lg:py-10">
        <div className="gc-container">
          <CalculatorSpotBadge metal="silver" />
        </div>
      </section>
      {/* Calculator filtered to silver rates only. */}
      <GoldCalculator rates={rates} metal="Silver" />
      <ItemsWeBuy items={items} />
      <HowItWorks />
      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="metal" defaultItemType="silver" />
        </div>
      </section>
    </>
  );
}

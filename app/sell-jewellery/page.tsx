import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/JsonLd';
import { breadcrumbSchema, serviceSchema, SITE_URL } from '@/lib/seo/structuredData';
import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';
import { getItemsWeBuy } from '@/lib/queries/items';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { SellSection } from '@/components/public/SellSection';
import { ItemsWeBuy } from '@/components/public/ItemsWeBuy';
import { ValuationForm } from '@/components/public/ValuationForm';
import { HowItWorks } from '@/components/public/HowItWorks';
import { ValuationExplanation } from '@/components/public/ValuationExplanation';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/sell-jewellery');
}

export default async function SellJewelleryPage() {
  const [sections, items] = await Promise.all([getHomepageSections(), getItemsWeBuy()]);

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Sell Fine Jewellery UK',
            description:
              'Receive a professional valuation for diamond rings, designer jewellery, antique pieces and inherited jewellery from a UK private specialist.',
            url: `${SITE_URL}/sell-jewellery`,
            serviceType: 'Jewellery valuation service',
          }),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Jewellery', url: `${SITE_URL}/sell-jewellery` },
          ]),
        ]}
      />
      {/* SellSection acts as the page hero - title renders as <h1>. */}
      <SellSection
        section={findHomepageSection(sections, 'jewellery_intro')}
        variant="jewellery"
        asH1
      />
      <ValuationExplanation section={findHomepageSection(sections, 'valuation_explainer')} />
      <ItemsWeBuy items={items} />
      <HowItWorks />
      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="jewellery" defaultItemType="jewellery" />
        </div>
      </section>
    </>
  );
}

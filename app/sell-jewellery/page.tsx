import type { Metadata } from 'next';
import { JsonLd } from '@/lib/seo/JsonLd';
import { breadcrumbSchema, serviceSchema, SITE_URL } from '@/lib/seo/structuredData';
import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';
import { getItemsWeBuy } from '@/lib/queries/items';
import { SellSection } from '@/components/public/SellSection';
import { ItemsWeBuy } from '@/components/public/ItemsWeBuy';
import { ValuationForm } from '@/components/public/ValuationForm';
import { HowItWorks } from '@/components/public/HowItWorks';
import { ValuationExplanation } from '@/components/public/ValuationExplanation';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Sell Fine Jewellery · Diamond, Antique & Branded Specialists',
  description:
    'Receive a professional valuation for diamond rings, designer jewellery, antique pieces and inherited jewellery from a discreet UK private specialist.',
  keywords: [
    'sell jewellery UK',
    'sell diamond ring UK',
    'sell engagement ring UK',
    'sell antique jewellery',
    'sell vintage jewellery',
    'sell inherited jewellery',
    'sell designer jewellery',
    'sell branded jewellery',
    'jewellery valuation UK',
  ],
  alternates: { canonical: `${SITE_URL}/sell-jewellery` },
  openGraph: {
    url: `${SITE_URL}/sell-jewellery`,
    title: 'Sell Fine Jewellery UK · Diamond, Antique, Designer',
    description:
      'Professional jewellery valuation from a discreet UK private specialist. Same-day payment, transparent offers.',
  },
};

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
      {/* SellSection acts as the page hero — title renders as <h1>. */}
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

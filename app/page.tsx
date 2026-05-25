import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';
import { getServices } from '@/lib/queries/services';
import { getItemsWeBuy, getTrustCards } from '@/lib/queries/items';
import { getFaqs } from '@/lib/queries/faqs';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { getProducts } from '@/lib/queries/products';
import { BUY_ENABLED } from '@/lib/features';
import { JsonLd } from '@/lib/seo/JsonLd';
import { faqPageSchema, serviceSchema, SITE_URL } from '@/lib/seo/structuredData';

import { Hero } from '@/components/public/Hero';
import { BrandIntro } from '@/components/public/BrandIntro';
import { SellBuyPathways } from '@/components/public/SellBuyPathways';
import { ServiceCards } from '@/components/public/ServiceCards';
import { SellSection } from '@/components/public/SellSection';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { ShopTeaser } from '@/components/public/ShopTeaser';
import { ItemsWeBuy } from '@/components/public/ItemsWeBuy';
import { ValuationExplanation } from '@/components/public/ValuationExplanation';
import { HowItWorks } from '@/components/public/HowItWorks';
import { TrustSection } from '@/components/public/TrustSection';
import { ValuationForm } from '@/components/public/ValuationForm';
import { FAQSection } from '@/components/public/FAQSection';

export const revalidate = 120;

export default async function HomePage() {
  const [sections, allServices, items, trust, faqs, rates, products] = await Promise.all([
    getHomepageSections(),
    getServices(),
    getItemsWeBuy(),
    getTrustCards(),
    getFaqs(),
    getCalculatorRates(),
    BUY_ENABLED ? getProducts({ featuredOnly: false, limit: 8 }) : Promise.resolve([]),
  ]);

  // When buy is disabled, only show services on the sell pathway.
  // Also hide the Gold Calculator service tile — it's now promoted to a
  // dedicated header CTA so listing it again here would be redundant.
  const services = (BUY_ENABLED
    ? allServices
    : allServices.filter((s) => s.pathway !== 'buy')
  ).filter((s) => s.slug !== 'gold-calculator' && s.cta_href !== '/gold-calculator');

  return (
    <>
      <JsonLd
        data={[
          // Declare the four core services from the homepage so Google
          // understands what we offer at a glance, even without visiting
          // each sell page.
          serviceSchema({
            name: 'Sell Gold UK',
            description: 'Buying gold rings, chains, bracelets, coins, bars and scrap gold in the UK.',
            url: `${SITE_URL}/sell-gold`,
            serviceType: 'Gold buying service',
          }),
          serviceSchema({
            name: 'Sell Fine Jewellery UK',
            description:
              'Buying diamond rings, designer jewellery, antique pieces and inherited jewellery.',
            url: `${SITE_URL}/sell-jewellery`,
            serviceType: 'Jewellery valuation service',
          }),
          serviceSchema({
            name: 'Sell Designer Handbags UK',
            description: 'Buying pre-loved Hermès, Chanel, Louis Vuitton and other premium designer handbags.',
            url: `${SITE_URL}/sell-handbags`,
            serviceType: 'Designer handbag buying service',
          }),
          serviceSchema({
            name: 'Sell Luxury Watches UK',
            description:
              'Buying Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier and other fine timepieces.',
            url: `${SITE_URL}/sell-watches`,
            serviceType: 'Luxury watch buying service',
          }),
          // FAQ schema on the homepage so the FAQ rich-snippet can appear
          // for branded searches too, not just on /faqs.
          faqPageSchema(faqs),
        ]}
      />
      <Hero section={findHomepageSection(sections, 'hero')} />
      {BUY_ENABLED && (
        <SellBuyPathways section={findHomepageSection(sections, 'sell_buy_pathways')} />
      )}
      <ServiceCards services={services} />
      <SellSection section={findHomepageSection(sections, 'sell_intro')} variant="gold" />
      <SellSection section={findHomepageSection(sections, 'jewellery_intro')} variant="jewellery" />
      <SellSection section={findHomepageSection(sections, 'handbag_intro')} variant="jewellery" />
      <SellSection section={findHomepageSection(sections, 'watch_intro')} variant="gold" />
      <GoldCalculator rates={rates} />
      {BUY_ENABLED && (
        <ShopTeaser section={findHomepageSection(sections, 'shop_intro')} products={products} />
      )}
      <ItemsWeBuy items={items} />
      <ValuationExplanation section={findHomepageSection(sections, 'valuation_explainer')} />
      <HowItWorks
        sellSection={findHomepageSection(sections, 'how_it_works_sell')}
        buySection={findHomepageSection(sections, 'how_it_works_buy')}
      />
      <TrustSection cards={trust} />

      <section className="relative py-6 lg:py-10" id="valuation-form">
        <div className="gc-container">
          <div className="mx-auto max-w-3xl text-center">
            <span className="gc-eyebrow">Begin Your Valuation</span>
            <h2 className="gc-heading mt-3">Request a Private Valuation</h2>
            <p className="gc-subhead mt-4">
              Share photos and a few details. A specialist will respond within one working day.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-4xl">
            <ValuationForm variant="metal" />
          </div>
        </div>
      </section>

      <BrandIntro section={findHomepageSection(sections, 'brand_intro')} />
      <FAQSection faqs={faqs} />
    </>
  );
}

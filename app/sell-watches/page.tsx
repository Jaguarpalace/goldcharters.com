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
import type { HomepageSection } from '@/types/database';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/sell-watches');
}

// Hardcoded fallback so the page works before the migration adds the row.
const FALLBACK_SECTION: HomepageSection = {
  id: 'fallback-watch',
  section_key: 'watch_intro',
  title: 'Sell Luxury Watches',
  subtitle: null,
  body: 'Specialist valuations for fine timepieces — Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier and other premium watchmakers. Movement, condition, papers and box all factored in.',
  cta_label: 'Sell My Watch',
  cta_href: '#valuation-form',
  image_url: null,
  extra: {
    bullets: [
      'Rolex · Submariner, Daytona, GMT, Datejust',
      'Patek Philippe · Nautilus, Calatrava, Aquanaut',
      'Audemars Piguet · Royal Oak',
      'Omega, Cartier, IWC, Jaeger-LeCoultre',
      'Box, papers & service history valued',
      'Vintage pieces welcomed',
      'Upload multiple photos',
    ],
  },
  display_order: 7,
  visible: true,
  updated_at: new Date().toISOString(),
};

export default async function SellWatchesPage() {
  const [sections, items] = await Promise.all([getHomepageSections(), getItemsWeBuy()]);

  const section = findHomepageSection(sections, 'watch_intro') ?? FALLBACK_SECTION;

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Sell Luxury Watches UK',
            description:
              'Sell luxury watches — Rolex, Patek Philippe, Audemars Piguet, Omega, Cartier — to a discreet UK specialist. Movement, papers and provenance fully assessed.',
            url: `${SITE_URL}/sell-watches`,
            serviceType: 'Luxury watch buying service',
          }),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Watches', url: `${SITE_URL}/sell-watches` },
          ]),
        ]}
      />
      <SellSection section={section} variant="gold" asH1 />
      <ItemsWeBuy items={items} />
      <HowItWorks />
      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="watch" defaultItemType="watches" />
        </div>
      </section>
    </>
  );
}

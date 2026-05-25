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
  return buildPageMetadata('/sell-handbags');
}

// Hardcoded fallback so the page is fully functional even before the
// supabase/migrations/002_handbags_watches.sql migration is applied.
const FALLBACK_SECTION: HomepageSection = {
  id: 'fallback-handbag',
  section_key: 'handbag_intro',
  title: 'Sell Designer Handbags',
  subtitle: null,
  body: 'Discreet valuations for pre-loved designer handbags — Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada, Bottega Veneta and other premium houses. Authenticity verified, fair offers, fast settlement.',
  cta_label: 'Sell My Handbag',
  cta_href: '#valuation-form',
  image_url: null,
  extra: {
    bullets: [
      'Hermès · Birkin, Kelly, Constance',
      'Chanel · Classic Flap, Boy, 2.55',
      'Louis Vuitton · select pieces',
      'Dior, Gucci, Prada, Bottega Veneta',
      'Authenticity verified by specialists',
      'Original box & dustbag enhances offer',
      'Upload multiple photos',
    ],
  },
  display_order: 6,
  visible: true,
  updated_at: new Date().toISOString(),
};

export default async function SellHandbagsPage() {
  const [sections, items] = await Promise.all([getHomepageSections(), getItemsWeBuy()]);

  // Prefer the editable CMS row if it exists, otherwise show the hardcoded fallback.
  const section = findHomepageSection(sections, 'handbag_intro') ?? FALLBACK_SECTION;

  return (
    <>
      <JsonLd
        data={[
          serviceSchema({
            name: 'Sell Designer Handbags UK',
            description:
              'Sell pre-loved designer handbags — Hermès, Chanel, Louis Vuitton, Dior, Gucci, Prada — to a discreet UK private specialist. Authentication included.',
            url: `${SITE_URL}/sell-handbags`,
            serviceType: 'Designer handbag buying service',
          }),
          breadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sell Handbags', url: `${SITE_URL}/sell-handbags` },
          ]),
        ]}
      />
      <SellSection section={section} variant="jewellery" asH1 />
      <ItemsWeBuy items={items} />
      <HowItWorks />
      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="handbag" defaultItemType="handbags" />
        </div>
      </section>
    </>
  );
}

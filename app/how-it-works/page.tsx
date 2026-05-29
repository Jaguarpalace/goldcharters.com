import type { Metadata } from 'next';
import { HowItWorks } from '@/components/public/HowItWorks';
import { ValuationExplanation } from '@/components/public/ValuationExplanation';
import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';
import { buildPageMetadata } from '@/lib/queries/pageSeo';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/how-it-works');
}

export default async function HowItWorksPage() {
  const sections = await getHomepageSections();

  return (
    <>
      {/* HowItWorks acts as the page hero - title renders as <h1>. */}
      <HowItWorks
        asH1
        sellSection={findHomepageSection(sections, 'how_it_works_sell')}
        buySection={findHomepageSection(sections, 'how_it_works_buy')}
      />
      <ValuationExplanation section={findHomepageSection(sections, 'valuation_explainer')} />
    </>
  );
}

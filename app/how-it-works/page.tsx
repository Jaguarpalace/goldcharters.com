import type { Metadata } from 'next';
import { HowItWorks } from '@/components/public/HowItWorks';
import { ValuationExplanation } from '@/components/public/ValuationExplanation';
import { findHomepageSection, getHomepageSections } from '@/lib/queries/homepage';

export const revalidate = 120;

import { SITE_URL } from '@/lib/seo/structuredData';

export const metadata: Metadata = {
  title: 'How It Works · Selling Gold & Jewellery To Us',
  description:
    'A simple three-step process: tell us about your items, receive a professional valuation, get paid by bank transfer. No pressure, no obligation.',
  alternates: { canonical: `${SITE_URL}/how-it-works` },
  openGraph: { url: `${SITE_URL}/how-it-works` },
};

export default async function HowItWorksPage() {
  const sections = await getHomepageSections();

  return (
    <>
      {/* HowItWorks acts as the page hero — title renders as <h1>. */}
      <HowItWorks asH1 />
      <ValuationExplanation section={findHomepageSection(sections, 'valuation_explainer')} />
    </>
  );
}

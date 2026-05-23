import type { Metadata } from 'next';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { CalculatorSpotBadge } from '@/components/public/CalculatorSpotBadge';
import { ValuationForm } from '@/components/public/ValuationForm';

export const revalidate = 60;

import { SITE_URL } from '@/lib/seo/structuredData';

export const metadata: Metadata = {
  title: 'Gold Calculator · Live Price Per Gram',
  description:
    'Free gold calculator with live spot pricing. Enter weights in grams across 9ct, 14ct, 18ct, 22ct, 24ct gold plus silver, platinum and palladium — instant guide price.',
  keywords: [
    'gold calculator UK',
    'gold price per gram UK',
    'gold price calculator',
    '22ct gold price per gram',
    '18ct gold price per gram',
    '9ct gold price per gram',
    'live gold price UK',
    'scrap gold price calculator',
  ],
  alternates: { canonical: `${SITE_URL}/gold-calculator` },
  openGraph: {
    url: `${SITE_URL}/gold-calculator`,
    title: 'Gold Calculator UK · Live Spot Price Per Gram',
    description: 'Instant gold guide price by carat and weight, refreshed every 15 minutes.',
  },
};

export default async function GoldCalculatorPage() {
  const rates = await getCalculatorRates();

  return (
    <>
      <section className="relative py-6 lg:py-10">
        <div className="gc-container">
          <CalculatorSpotBadge />
        </div>
      </section>

      {/* GoldCalculator acts as the page hero — its title renders as <h1>. */}
      <GoldCalculator rates={rates} asH1 />

      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="metal" defaultItemType="gold" />
        </div>
      </section>
    </>
  );
}

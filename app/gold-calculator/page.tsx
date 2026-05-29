import type { Metadata } from 'next';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { buildPageMetadata } from '@/lib/queries/pageSeo';
import { GoldCalculator } from '@/components/public/GoldCalculator';
import { CalculatorSpotBadge } from '@/components/public/CalculatorSpotBadge';
import { ValuationForm } from '@/components/public/ValuationForm';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata('/gold-calculator');
}

export default async function GoldCalculatorPage() {
  const rates = await getCalculatorRates();

  return (
    <>
      <section className="relative py-6 lg:py-10">
        <div className="gc-container">
          <CalculatorSpotBadge />
        </div>
      </section>

      {/* GoldCalculator acts as the page hero - its title renders as <h1>. */}
      <GoldCalculator rates={rates} asH1 />

      <section className="py-6 lg:py-10" id="valuation-form">
        <div className="gc-container max-w-4xl">
          <ValuationForm variant="metal" defaultItemType="gold" />
        </div>
      </section>
    </>
  );
}

import { getCalculatorRates } from '@/lib/queries/calculator';
import { CalculatorRatesEditor } from './CalculatorRatesEditor';

export const dynamic = 'force-dynamic';

export default async function AdminCalculatorRatesPage() {
  // Admin sees hidden rows too so they can re-enable them.
  const rates = await getCalculatorRates({ includeHidden: true });
  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">CMS</span>
        <h1 className="font-display text-2xl text-white mt-2">Gold Calculator Rates</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Set the price-per-gram for each metal and carat. The public calculator pulls from this table - your
          changes appear on the website automatically.
        </p>
      </header>

      <CalculatorRatesEditor initialRates={rates} />
    </div>
  );
}

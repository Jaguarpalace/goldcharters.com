import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';

type MetalKey = 'gold' | 'silver' | 'platinum' | 'palladium';

/**
 * Small contextual card shown above a metal calculator.
 * Server component — fetches spot prices with 15-min cache, then renders.
 * Hides gracefully if the API isn't configured or the call failed.
 *
 * Defaults to gold for the legacy /gold-calculator page; pass `metal="silver"`
 * (or any other supported metal) on dedicated /sell-<metal> pages so the
 * displayed purities and labelling match.
 */
export async function CalculatorSpotBadge({ metal = 'gold' }: { metal?: MetalKey } = {}) {
  const spots = await getMetalSpots();
  const spot = spots[metal];
  if (!spot) return null;

  const pure = spot.per_gram_gbp;
  const carats = puritiesFor(metal, pure);

  const metalLabel = metal.charAt(0).toUpperCase() + metal.slice(1);

  return (
    <div className="gc-card gc-card-gold-edge mb-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="inline-block h-2 w-2 flex-none rounded-full bg-emerald-400"
          style={{ boxShadow: '0 0 8px rgba(52,211,153,0.7)' }}
        />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Live {metalLabel.toLowerCase()} spot price · today
          </p>
          <p className="text-xs text-warmgrey">
            Updated {new Date(spots.fetched_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · refreshes every hour
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {carats.map((c) =>
          c.value ? (
            <li key={c.label} className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-luxe text-gold-metallic">
                {c.label}
              </span>
              <span className="font-medium text-white">{formatGBP(c.value)}/g</span>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

/**
 * Returns the small set of purities we want to surface on each metal's badge.
 * Gold breaks down by carat; silver by sterling vs fine; platinum/palladium
 * default to the common 950 hallmark.
 */
function puritiesFor(metal: MetalKey, pure: number): Array<{ label: string; value: number | null }> {
  switch (metal) {
    case 'gold':
      return [
        { label: '24ct', value: pure },
        { label: '22ct', value: spotForPurity(pure, 91.6) },
        { label: '18ct', value: spotForPurity(pure, 75.0) },
        { label: '9ct', value: spotForPurity(pure, 37.5) },
      ];
    case 'silver':
      return [
        { label: '999', value: pure },
        { label: '958', value: spotForPurity(pure, 95.8) },
        { label: '925', value: spotForPurity(pure, 92.5) },
        { label: '800', value: spotForPurity(pure, 80.0) },
      ];
    case 'platinum':
      return [
        { label: '999', value: pure },
        { label: '950', value: spotForPurity(pure, 95.0) },
        { label: '900', value: spotForPurity(pure, 90.0) },
      ];
    case 'palladium':
      return [
        { label: '999', value: pure },
        { label: '950', value: spotForPurity(pure, 95.0) },
        { label: '500', value: spotForPurity(pure, 50.0) },
      ];
  }
}

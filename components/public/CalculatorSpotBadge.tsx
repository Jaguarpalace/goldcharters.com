import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';

/**
 * Small contextual card shown above the gold calculator.
 * Server component — fetches spot prices with 15-min cache, then renders.
 * Hides gracefully if the API isn't configured or the call failed.
 */
export async function CalculatorSpotBadge() {
  const spots = await getMetalSpots();
  if (!spots.gold) return null;

  const pure = spots.gold.per_gram_gbp;
  const carats = [
    { label: '24ct', value: pure },
    { label: '22ct', value: spotForPurity(pure, 91.6) },
    { label: '18ct', value: spotForPurity(pure, 75.0) },
    { label: '9ct', value: spotForPurity(pure, 37.5) },
  ];

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
            Live spot price · today
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

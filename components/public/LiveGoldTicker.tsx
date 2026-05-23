import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';

// Server component — runs on the server, never ships the API key to the client.
// Rendered inside the trust bar at the top of every page.

export async function LiveGoldTicker() {
  const spots = await getMetalSpots();
  if (!spots.gold) return null; // graceful hide if API is down or not configured

  // Show 22ct figure — that's what most UK clients ask about when selling gold.
  const per22ct = spotForPurity(spots.gold.per_gram_gbp, 91.6);
  if (!per22ct) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
        style={{ boxShadow: '0 0 6px rgba(52,211,153,0.7)' }}
        title="Live"
      />
      <span className="text-gold-tint">22ct gold {formatGBP(per22ct)}/g</span>
    </span>
  );
}

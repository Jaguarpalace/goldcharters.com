import type { MetalSnapshot } from '@/lib/services/metalPrice';

/**
 * Surface a clear amber banner when the live spot feed is unavailable.
 * Two failure modes are distinguished:
 *   - API not configured (METAL_PRICE_API_KEY missing) — every metal null
 *     and fetched_at is present but stale. Show the most helpful copy.
 *   - Live fetch failed at request time — same shape but treat the same.
 *
 * Returns null when at least one metal price is present (the happy path),
 * so adopting this banner is a one-line no-op when everything's working.
 */
export function SpotStaleBanner({ snapshot }: { snapshot: MetalSnapshot }) {
  const allMissing =
    snapshot.gold === null &&
    snapshot.silver === null &&
    snapshot.platinum === null &&
    snapshot.palladium === null;
  if (!allMissing) return null;

  return (
    <div
      role="status"
      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
    >
      <strong className="font-semibold">Live spot prices unavailable.</strong>{' '}
      The metal-price API didn't respond. Holdings show their cost basis only;
      live revaluation will resume automatically when the feed is back. Check
      the <code className="font-mono text-amber-100">METAL_PRICE_API_KEY</code>{' '}
      environment variable if the outage persists.
    </div>
  );
}

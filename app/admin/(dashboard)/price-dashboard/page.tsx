import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';

export const dynamic = 'force-dynamic';

const CARATS = [
  { label: '24ct', purity: 99.99 },
  { label: '22ct', purity: 91.6 },
  { label: '21ct', purity: 87.5 },
  { label: '18ct', purity: 75.0 },
  { label: '14ct', purity: 58.5 },
  { label: '10ct', purity: 41.7 },
  { label: '9ct', purity: 37.5 },
];

export default async function PriceDashboardPage() {
  const spots = await getMetalSpots();

  const haveKey = Boolean(process.env.METAL_PRICE_API_KEY);

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Market</span>
        <h1 className="font-display text-4xl text-white mt-2">Live Spot Prices</h1>
        <p className="mt-2 text-sm text-warmgrey">
          Server-cached for 1 hour — last refreshed{' '}
          {new Date(spots.fetched_at).toLocaleString('en-GB')}.
        </p>
      </header>

      {!haveKey && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          The metal-price API key isn&apos;t configured. Set{' '}
          <code className="text-amber-100">METAL_PRICE_API_KEY</code> in{' '}
          <code className="text-amber-100">.env.local</code> and restart the dev server.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <SpotCard label="Gold (XAU)" spot={spots.gold} />
        <SpotCard label="Silver (XAG)" spot={spots.silver} />
        <SpotCard label="Platinum (XPT)" spot={spots.platinum} />
        <SpotCard label="Palladium (XPD)" spot={spots.palladium} />
      </section>

      {spots.gold && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
            Gold by carat — pure spot, before margin
          </h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-gold-metallic/15">
            <table className="min-w-full divide-y divide-gold-metallic/10 text-sm">
              <thead className="bg-ink-900/80 text-left text-[11px] uppercase tracking-luxe text-warmgrey">
                <tr>
                  <th className="px-5 py-3">Carat</th>
                  <th className="px-5 py-3">Purity %</th>
                  <th className="px-5 py-3 text-right">Spot · £/g</th>
                  <th className="px-5 py-3 text-right">@ 95% margin</th>
                  <th className="px-5 py-3 text-right">@ 90% margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-metallic/10">
                {CARATS.map((c) => {
                  const spot = spotForPurity(spots.gold!.per_gram_gbp, c.purity);
                  if (!spot) return null;
                  return (
                    <tr key={c.label} className="hover:bg-ink-900/40">
                      <td className="px-5 py-3 text-white">{c.label}</td>
                      <td className="px-5 py-3 text-warmgrey">{c.purity}</td>
                      <td className="px-5 py-3 text-right font-medium text-gold-tint">
                        {formatGBP(spot)}
                      </td>
                      <td className="px-5 py-3 text-right text-warmgrey">
                        {formatGBP(spot * 0.95)}
                      </td>
                      <td className="px-5 py-3 text-right text-warmgrey">
                        {formatGBP(spot * 0.90)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-warmgrey">
            Use these figures to set the <code className="text-gold-tint">margin %</code> on each row in{' '}
            <a href="/admin/calculator-rates" className="text-gold-tint hover:text-gold-bright">
              Calculator Rates
            </a>
            .
          </p>
        </section>
      )}
    </div>
  );
}

function SpotCard({
  label,
  spot,
}: {
  label: string;
  spot: { per_gram_gbp: number; per_ounce_gbp: number } | null;
}) {
  return (
    <div className="gc-card gc-card-gold-edge p-6">
      <p className="text-[10px] uppercase tracking-luxe text-gold-tint">{label}</p>
      {spot ? (
        <>
          <p className="mt-3 font-display text-4xl text-white">{formatGBP(spot.per_gram_gbp)}</p>
          <p className="text-sm text-warmgrey">per gram</p>
          <p className="mt-3 text-sm text-warmgrey">
            <span className="text-gold-tint">{formatGBP(spot.per_ounce_gbp)}</span> per troy ounce
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-warmgrey">No data — API not configured or call failed.</p>
      )}
    </div>
  );
}

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

/**
 * Diagnostic: hit the metal price API directly (no Next.js cache) so the
 * admin can see exactly what the upstream provider is returning *right
 * now*, including the raw rates JSON, the HTTP status and any error.
 */
async function fetchRawApi() {
  const apiKey = process.env.METAL_PRICE_API_KEY;
  if (!apiKey) {
    return {
      keyConfigured: false,
      keyPreview: null,
      keyLength: 0,
      httpStatus: null,
      body: null,
      fetchError: null,
    };
  }

  const url = new URL('https://api.metalpriceapi.com/v1/latest');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('base', 'GBP');
  url.searchParams.set('currencies', 'XAU,XAG,XPT,XPD');

  try {
    const response = await fetch(url.toString(), { cache: 'no-store' });
    const body = await response.json().catch(() => null);
    return {
      keyConfigured: true,
      keyPreview: `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`,
      keyLength: apiKey.length,
      httpStatus: response.status,
      body,
      fetchError: null as string | null,
    };
  } catch (e) {
    return {
      keyConfigured: true,
      keyPreview: `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`,
      keyLength: apiKey.length,
      httpStatus: null,
      body: null,
      fetchError: e instanceof Error ? e.message : String(e),
    };
  }
}

export default async function PriceDashboardPage() {
  const [spots, raw] = await Promise.all([getMetalSpots(), fetchRawApi()]);

  const apiHealthy = raw.httpStatus === 200 && raw.body?.success === true;

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

      {!raw.keyConfigured && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Live price feed temporarily unavailable. Showing the most recent cached values.
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
          <div className="mt-3 overflow-x-auto rounded-xl border border-gold-metallic/15">
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
                        {formatGBP(spot * 0.9)}
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

      {/* DIAGNOSTICS — raw API view so the admin can confirm exactly what
          metalpriceapi.com is returning, separate from the cached display. */}
      <section className="space-y-4 border-t border-gold-metallic/15 pt-8">
        <header className="flex items-baseline justify-between gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">
            API Diagnostics
          </h2>
          <span
            className={
              'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-luxe ' +
              (apiHealthy
                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40')
            }
          >
            {apiHealthy ? 'Healthy' : 'Issue detected'}
          </span>
        </header>
        <p className="text-xs text-warmgrey">
          Hits metalpriceapi.com directly with no caching. Useful when verifying that the env-var
          key in Vercel is working and the upstream is responding as expected.
        </p>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DiagRow
            label="Key configured"
            value={raw.keyConfigured ? 'Yes' : 'No'}
            warn={!raw.keyConfigured}
          />
          <DiagRow
            label="Key preview (first 4 · last 4)"
            value={raw.keyPreview ?? '—'}
            mono
          />
          <DiagRow label="Key length" value={String(raw.keyLength)} mono />
          <DiagRow
            label="HTTP status"
            value={raw.httpStatus !== null ? String(raw.httpStatus) : '—'}
            mono
            warn={raw.httpStatus !== null && raw.httpStatus !== 200}
          />
          {raw.fetchError && (
            <DiagRow label="Fetch error" value={raw.fetchError} warn />
          )}
        </dl>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Raw response body
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-gold-metallic/15 bg-ink-950 p-4 text-[11px] leading-relaxed text-warmgrey">
            {JSON.stringify(raw.body, null, 2)}
          </pre>
        </div>

        {raw.body && typeof raw.body === 'object' && 'rates' in raw.body && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
              Computed £/g (per pure metal, no margin)
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4 text-[12px]">
              <pre className="text-warmgrey">{computedFromRaw(raw.body as { rates?: Record<string, number> })}</pre>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------------------- helpers --------------------------- */

function computedFromRaw(body: { rates?: Record<string, number> }): string {
  const rates = body.rates ?? {};
  const lines: string[] = [];
  const sym = (label: string, code: string) => {
    const rate = rates[code];
    if (!rate || rate <= 0) {
      lines.push(`${label.padEnd(12)} ${code}   missing or zero`);
      return;
    }
    const perOz = 1 / rate;
    const perGram = perOz / 31.1034768;
    lines.push(
      `${label.padEnd(12)} ${code}   rate=${rate.toFixed(8)}   £${perOz.toFixed(2)}/oz   £${perGram.toFixed(4)}/g`,
    );
  };
  sym('Gold', 'XAU');
  sym('Silver', 'XAG');
  sym('Platinum', 'XPT');
  sym('Palladium', 'XPD');
  return lines.join('\n');
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

function DiagRow({
  label,
  value,
  mono,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gold-metallic/10 py-2">
      <dt className="text-[11px] uppercase tracking-luxe text-warmgrey">{label}</dt>
      <dd
        className={
          (mono ? 'font-mono ' : '') +
          'text-[12px] ' +
          (warn ? 'text-amber-300' : 'text-white')
        }
      >
        {value}
      </dd>
    </div>
  );
}

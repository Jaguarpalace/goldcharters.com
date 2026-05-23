import Link from 'next/link';
import { getServices } from '@/lib/queries/services';
import { getCalculatorRates } from '@/lib/queries/calculator';
import { getProducts } from '@/lib/queries/products';
import { getFaqs } from '@/lib/queries/faqs';
import { getItemsWeBuy } from '@/lib/queries/items';
import { getSiteSettings } from '@/lib/queries/homepage';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listValuationRequests } from '@/lib/actions/valuationRequests';
import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';
import { BUY_ENABLED } from '@/lib/features';
import type { ValuationRequest } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  // Fetch in parallel — the page renders once everything resolves.
  const [services, rates, products, faqs, items, settings, spots] = await Promise.all([
    getServices(),
    getCalculatorRates(),
    BUY_ENABLED ? getProducts() : Promise.resolve([]),
    getFaqs(),
    getItemsWeBuy(),
    getSiteSettings(),
    getMetalSpots(),
  ]);

  const valuationRequests = (isSupabaseConfigured()
    ? ((await listValuationRequests()) as ValuationRequest[])
    : []);

  // Operational stats — only the ones that drive daily action.
  const newRequests = valuationRequests.filter((r) => r.status === 'new').length;
  const inProgress = valuationRequests.filter((r) =>
    ['contacted', 'valued', 'offer_sent'].includes(r.status),
  ).length;
  const closed = valuationRequests.filter((r) =>
    ['completed', 'rejected'].includes(r.status),
  ).length;

  const last7Days = valuationRequests.filter(
    (r) => Date.now() - +new Date(r.created_at) < 7 * 24 * 60 * 60 * 1000,
  ).length;

  const recent = valuationRequests.slice(0, 5);

  const goldPerGram22ct = spots.gold ? spotForPurity(spots.gold.per_gram_gbp, 91.6) : null;

  return (
    <div className="space-y-8">
      <header>
        <span className="text-[10px] uppercase tracking-luxe text-gold-metallic">Dashboard</span>
        <h1 className="font-display text-3xl font-semibold text-white mt-1 sm:text-4xl">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-warmgrey">
          Last updated {new Date(settings.updated_at).toLocaleString('en-GB')}
        </p>
      </header>

      {/* Primary KPIs — small, focused, actionable */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Enquiries</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="New (action needed)"
            value={newRequests}
            accent={newRequests > 0}
            href="/admin/valuation-requests"
          />
          <StatCard
            label="In progress"
            value={inProgress}
            href="/admin/valuation-requests"
          />
          <StatCard label="Last 7 days" value={last7Days} />
          <StatCard label="Closed (lifetime)" value={closed} />
        </ul>
      </section>

      {/* Market + CMS at a glance */}
      <section className="grid gap-3 lg:grid-cols-[1.4fr,1fr]">
        <div className="gc-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Live spot · today
          </p>
          {spots.gold && goldPerGram22ct ? (
            <div className="mt-3 grid gap-5 sm:grid-cols-3">
              <SpotMini label="24ct · pure" value={formatGBP(spots.gold.per_gram_gbp)} />
              <SpotMini label="22ct" value={formatGBP(goldPerGram22ct)} />
              <SpotMini
                label="18ct"
                value={formatGBP(spotForPurity(spots.gold.per_gram_gbp, 75.0) ?? 0)}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-warmgrey">
              Metal price API not configured. Set <code className="text-gold-tint">METAL_PRICE_API_KEY</code>{' '}
              in env to enable.
            </p>
          )}
          <p className="mt-3 text-[11px] text-warmgrey/70">
            Cached server-side · refreshes every 15 minutes
          </p>
        </div>

        <div className="gc-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">CMS health</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <CmsRow label="Services" value={services.length} />
            <CmsRow label="Items we buy" value={items.length} />
            <CmsRow label="FAQ entries" value={faqs.length} />
            <CmsRow label="Calculator rates" value={rates.length} />
            {BUY_ENABLED && <CmsRow label="Active products" value={products.filter((p) => p.status === 'active').length} />}
          </dl>
        </div>
      </section>

      {/* Quick actions — compact pills, not big cards */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          Quick actions
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          <QuickAction href="/admin/valuation-requests" label="Review enquiries" primary />
          <QuickAction href="/admin/calculator-rates" label="Calculator rates" />
          <QuickAction href="/admin/homepage" label="Homepage content" />
          <QuickAction href="/admin/faqs" label="FAQs" />
          <QuickAction href="/admin/items-we-buy" label="Items we buy" />
          <QuickAction href="/admin/settings" label="Site settings" />
          <QuickAction href="/admin/price-dashboard" label="Live prices" />
        </ul>
      </section>

      {/* Recent enquiries table */}
      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Recent valuation requests
          </h2>
          <Link
            href="/admin/valuation-requests"
            className="text-[10px] uppercase tracking-luxe text-gold-metallic hover:text-gold-bright"
          >
            View all →
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-gold-metallic/15">
          <table className="min-w-full divide-y divide-gold-metallic/10 text-sm">
            <thead className="bg-ink-900/80 text-left text-[10px] uppercase tracking-luxe text-warmgrey">
              <tr>
                <th className="px-4 py-2.5">Received</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Branch</th>
                <th className="px-4 py-2.5">Summary</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-metallic/10">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-warmgrey">
                    No requests yet — they appear here as customers submit the form.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-900/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-warmgrey">
                      {new Date(r.created_at).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-white">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] uppercase tracking-luxe text-gold-tint">
                      {r.form_variant ?? '—'}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-2.5 text-xs text-warmgrey">
                      {summarise(r)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-warmgrey">
                      {r.status.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* -------------------------- small helpers ---------------------------------- */

function summarise(r: ValuationRequest): string {
  const bits: string[] = [];
  if (r.metal_type) bits.push(r.metal_type);
  if (r.item_category) bits.push(r.item_category);
  if (r.brand) bits.push(r.brand);
  if (r.model) bits.push(r.model);
  if (r.carat) bits.push(r.carat);
  return bits.length > 0 ? bits.join(' · ') : (r.description?.slice(0, 60) ?? '—');
}

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  href?: string;
}) {
  const card = (
    <li
      className={
        'gc-card p-4 transition ' +
        (accent ? 'gc-card-gold-edge ring-1 ring-gold-metallic/40' : '') +
        (href ? ' hover:bg-ink-900' : '')
      }
    >
      <p className="text-[10px] uppercase tracking-luxe text-warmgrey">{label}</p>
      <p className={'mt-1 font-display text-2xl font-semibold ' + (accent ? 'text-gold-bright' : 'text-white')}>
        {value}
      </p>
    </li>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function SpotMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-luxe text-warmgrey">{label}</p>
      <p className="font-display text-xl font-semibold text-white">{value}<span className="text-xs font-normal text-warmgrey">/g</span></p>
    </div>
  );
}

function CmsRow({ label, value }: { label: string; value: number | string }) {
  return (
    <>
      <dt className="text-warmgrey">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </>
  );
}

function QuickAction({
  href,
  label,
  primary,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={
          primary
            ? 'inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-2 text-xs font-semibold uppercase tracking-luxe text-ink-950 shadow-[0_0_14px_rgba(212,175,55,0.35)]'
            : 'inline-flex items-center gap-2 rounded-full border border-gold-metallic/30 bg-ink-900/60 px-4 py-2 text-xs font-semibold uppercase tracking-luxe text-warmgrey hover:border-gold-metallic hover:text-gold-bright'
        }
      >
        {label}
      </Link>
    </li>
  );
}

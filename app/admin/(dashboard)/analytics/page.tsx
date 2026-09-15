import Link from 'next/link';
import { getSiteSettings } from '@/lib/queries/homepage';
import { getEnquiryAnalytics, type Bucket } from '@/lib/queries/analytics';
import { AnalyticsSettings } from './AnalyticsSettings';
import { formatDateTimeGB } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * Analytics: enquiries by source and by page, from the site's own records
 * (attribution captured with every valuation request and booking), plus
 * the Google tag configuration. Phone and WhatsApp taps are only visible in
 * Google Analytics, since they leave the site without creating a record.
 */
export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: { days?: string };
}) {
  const days = [7, 30, 90].includes(Number(searchParams?.days)) ? Number(searchParams?.days) : 30;
  const [settings, data] = await Promise.all([getSiteSettings(), getEnquiryAnalytics(days)]);
  const max = Math.max(1, ...data.byDay.map((d) => d.count));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">Performance</span>
          <h1 className="mt-1 font-display text-2xl text-white">Analytics</h1>
          <p className="mt-1 max-w-2xl text-xs text-warmgrey">
            Where enquiries come from and which page produced them, recorded by the site itself
            with every valuation request and booking. Phone and WhatsApp taps do not create a
            record here; they are counted in Google Analytics once the tag below is set up.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-gold-metallic/20 p-1 text-[11px] uppercase tracking-luxe">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?days=${d}`}
              className={
                'rounded px-3 py-1.5 transition ' +
                (days === d ? 'bg-gold-gradient text-ink-950' : 'text-warmgrey hover:text-gold-bright')
              }
            >
              {d} days
            </Link>
          ))}
        </div>
      </header>

      {!data.available && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Attribution columns are not in the database yet. Run migration 036 in the Supabase SQL
          Editor; enquiries submitted after that will appear here.
        </div>
      )}

      {/* Headline numbers */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={`Enquiries, last ${days} days`} value={data.total} />
        <Stat label="Valuation requests" value={data.valuations} />
        <Stat label="Bookings" value={data.bookings} />
        <Stat
          label="With a known source"
          value={data.attributed}
          hint={data.total ? `${Math.round((data.attributed / data.total) * 100)}% of enquiries` : undefined}
        />
      </div>

      {/* Per-day strip */}
      <section className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Enquiries per day</h2>
        <div className="mt-3 flex h-24 items-end gap-[2px]">
          {data.byDay.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.count}`}
              className="flex-1 rounded-t-sm bg-gold-metallic/70"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-warmgrey">
          <span>{data.byDay[0]?.day}</span>
          <span>{data.byDay[data.byDay.length - 1]?.day}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BucketTable title="By source" rows={data.bySource} empty="No enquiries in this period." />
        <BucketTable title="By page the form was on" rows={data.byPage} empty="No attributed enquiries yet." />
        <BucketTable title="By landing page (first page of the visit)" rows={data.byLanding} empty="No attributed enquiries yet." />
        <BucketTable title="By campaign" rows={data.byCampaign} empty="No campaign-tagged enquiries. Google Ads clicks and UTM links appear here." />
      </div>

      {/* Recent enquiries with their source */}
      <section className="rounded-lg border border-gold-metallic/15 bg-ink-900/40">
        <div className="border-b border-gold-metallic/10 px-4 py-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">Recent enquiries</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-luxe text-warmgrey">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Who</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Page</th>
                <th className="px-4 py-2">Landed on</th>
                <th className="px-4 py-2">Campaign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-metallic/10">
              {data.recent.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-warmgrey">
                    Nothing in this period.
                  </td>
                </tr>
              )}
              {data.recent.map((r) => (
                <tr key={r.kind + r.id} className="text-warmgrey">
                  <td className="whitespace-nowrap px-4 py-2">{formatDateTimeGB(r.created_at)}</td>
                  <td className="px-4 py-2 text-white">
                    <Link
                      href={r.kind === 'valuation' ? `/admin/valuation-requests?open=${r.id}` : '/admin/appointments'}
                      className="hover:text-gold-bright"
                    >
                      {r.name || 'Unnamed'}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.kind === 'valuation' ? `Valuation${r.form_variant ? ` · ${r.form_variant}` : ''}` : 'Booking'}</td>
                  <td className="px-4 py-2">
                    <span className="rounded border border-gold-metallic/30 px-1.5 py-0.5 text-[10px] uppercase tracking-luxe text-gold-tint">
                      {r.source}
                    </span>
                  </td>
                  <td className="px-4 py-2">{r.source_page ? r.page_label : '-'}</td>
                  <td className="px-4 py-2">{r.landing_page ? r.landing_label : '-'}</td>
                  <td className="px-4 py-2">{r.utm_campaign || (r.gclid ? 'Google Ads' : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AnalyticsSettings
        settingsId={settings.id}
        initial={{
          ga_measurement_id: settings.ga_measurement_id ?? '',
          google_ads_conversion_id: settings.google_ads_conversion_id ?? '',
          google_ads_conversion_label: settings.google_ads_conversion_label ?? '',
        }}
      />
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{label}</div>
      <div className="mt-1 font-display text-3xl text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-warmgrey">{hint}</div>}
    </div>
  );
}

function BucketTable({ title, rows, empty }: { title: string; rows: Bucket[]; empty: string }) {
  return (
    <section className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-4">
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-warmgrey">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-xs">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-white">{r.label}</span>
                <span className="whitespace-nowrap text-warmgrey">
                  {r.count} · {r.share}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-ink-950/80">
                <div className="h-full rounded bg-gold-metallic/70" style={{ width: `${r.share}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

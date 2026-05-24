import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listValuationRequests } from '@/lib/actions/valuationRequests';
import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';
import {
  VALUATION_STATUS_LABELS,
  type ValuationRequest,
  type ValuationRequestStatus,
} from '@/types/database';

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const SLA_HOURS = 18;
const PIPELINE: ValuationRequestStatus[] = [
  'new',
  'contacted',
  'offer_sent',
  'booked',
  'bought',
];

export default async function AdminOverview() {
  const [spots] = await Promise.all([getMetalSpots()]);
  const requests = (isSupabaseConfigured()
    ? ((await listValuationRequests()) as ValuationRequest[])
    : []);

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const within = (since: number) => (r: ValuationRequest) =>
    +new Date(r.created_at) >= since;

  const today = requests.filter(within(+startOfDay));
  const week = requests.filter(within(now - WEEK_MS));
  const month = requests.filter(within(+startOfMonth));

  const paidIn = (rows: ValuationRequest[]) =>
    rows.reduce((sum, r) => sum + (r.paid_at ? Number(r.payment_amount ?? 0) : 0), 0);

  // Pipeline counts (all-time). Reduce in one pass.
  const pipelineCounts = requests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  // Action needed: status === 'new' and older than the SLA cutoff.
  const slaCutoff = now - SLA_HOURS * 60 * 60 * 1000;
  const needsAction = requests
    .filter((r) => r.status === 'new' && +new Date(r.created_at) < slaCutoff)
    .slice(0, 6);

  // Recent activity feed — last 5 by updated_at (status change, note, etc.).
  const recent = [...requests]
    .sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
    .slice(0, 5);

  const goldGram = spots.gold?.per_gram_gbp ?? null;

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
            Dashboard
          </span>
          <h1 className="font-display text-3xl text-white mt-1 sm:text-4xl">Welcome back</h1>
        </div>
        <p className="hidden text-[10px] uppercase tracking-luxe text-warmgrey sm:block">
          Live · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      {/* HERO METRICS — typography led, no cards, hairline gold dividers */}
      <section className="grid grid-cols-1 sm:grid-cols-3">
        <Metric
          label="Today"
          enquiries={today.length}
          paid={paidIn(today)}
        />
        <Metric
          label="This week"
          enquiries={week.length}
          paid={paidIn(week)}
          withDivider
        />
        <Metric
          label="This month"
          enquiries={month.length}
          paid={paidIn(month)}
          withDivider
        />
      </section>

      {/* PIPELINE — single line of stages, arrows in between */}
      <section>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
            Pipeline
          </span>
          <Link
            href="/admin/valuation-requests"
            className="text-[10px] uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
          >
            View all →
          </Link>
        </div>
        <ol className="mt-5 flex items-center gap-1 overflow-x-auto pb-1">
          {PIPELINE.map((stage, i) => (
            <li key={stage} className="flex flex-none items-center gap-1">
              <Stage
                label={VALUATION_STATUS_LABELS[stage]}
                count={pipelineCounts[stage] ?? 0}
              />
              {i < PIPELINE.length - 1 && (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  className="flex-none text-gold-metallic/40"
                  aria-hidden
                >
                  <path d="M3 7h8M8 4l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* NEEDS ATTENTION + RECENT ACTIVITY */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Column
          title="Needs your attention"
          empty="Nothing waiting — every new enquiry has been picked up within the last 18 hours."
        >
          {needsAction.length > 0 && (
            <ul className="divide-y divide-gold-metallic/10">
              {needsAction.map((r) => (
                <AttentionRow key={r.id} request={r} now={now} />
              ))}
            </ul>
          )}
        </Column>

        <Column title="Recent activity" empty="No activity yet.">
          {recent.length > 0 && (
            <ul className="divide-y divide-gold-metallic/10">
              {recent.map((r) => (
                <ActivityRow key={r.id} request={r} now={now} />
              ))}
            </ul>
          )}
        </Column>
      </section>

      {/* LIVE SPOT — thin footer strip */}
      <section className="flex flex-wrap items-baseline gap-x-8 gap-y-3 border-t border-gold-metallic/15 pt-6">
        <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
          Live spot · gold
        </span>
        {goldGram ? (
          <>
            <SpotRow label="24ct" value={goldGram} />
            <SpotRow label="22ct" value={spotForPurity(goldGram, 91.6)} />
            <SpotRow label="18ct" value={spotForPurity(goldGram, 75.0)} />
            <SpotRow label="14ct" value={spotForPurity(goldGram, 58.5)} />
            <SpotRow label="9ct" value={spotForPurity(goldGram, 37.5)} />
          </>
        ) : (
          <span className="text-[11px] text-warmgrey">Live feed temporarily unavailable.</span>
        )}
      </section>
    </div>
  );
}

/* ----------------------------- Components -------------------------------- */

function Metric({
  label,
  enquiries,
  paid,
  withDivider = false,
}: {
  label: string;
  enquiries: number;
  paid: number;
  withDivider?: boolean;
}) {
  return (
    <div className={withDivider ? 'border-t border-gold-metallic/15 pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        {label}
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-white sm:text-5xl">
          {enquiries}
        </span>
        <span className="text-[11px] uppercase tracking-luxe text-warmgrey">
          {enquiries === 1 ? 'enquiry' : 'enquiries'}
        </span>
      </p>
      <p className="mt-1.5 text-sm text-warmgrey">
        <span className="font-display text-xl text-gold-tint">{formatGBP(paid)}</span>{' '}
        <span className="text-[10px] uppercase tracking-luxe text-warmgrey">paid out</span>
      </p>
    </div>
  );
}

function Stage({ label, count }: { label: string; count: number }) {
  const active = count > 0;
  return (
    <Link
      href="/admin/valuation-requests"
      className={
        'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 transition ' +
        (active
          ? 'border-gold-metallic/40 bg-ink-900/60 text-white hover:border-gold-metallic'
          : 'border-gold-metallic/10 bg-transparent text-warmgrey/70 hover:border-gold-metallic/30')
      }
    >
      <span className="font-display text-2xl leading-none">{count}</span>
      <span className="text-[9px] uppercase tracking-luxe">{label}</span>
    </Link>
  );
}

function Column({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  // Children is null/undefined when the list is empty; we render the
  // empty-state copy instead. Keeps both columns visually aligned.
  const hasContent =
    children !== null && children !== undefined && children !== false;
  return (
    <div>
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        {title}
      </h2>
      <div className="mt-4">
        {hasContent ? (
          children
        ) : (
          <p className="py-4 text-[12px] leading-relaxed text-warmgrey">{empty}</p>
        )}
      </div>
    </div>
  );
}

function AttentionRow({ request, now }: { request: ValuationRequest; now: number }) {
  const ageHours = Math.floor((now - +new Date(request.created_at)) / (60 * 60 * 1000));
  return (
    <li>
      <Link
        href="/admin/valuation-requests"
        className="group flex items-center justify-between gap-4 py-3 transition hover:bg-ink-900/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-white">
            {request.first_name} {request.last_name}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-warmgrey">
            {summarise(request)}
          </span>
        </span>
        <span className="whitespace-nowrap text-[11px] uppercase tracking-luxe text-amber-300">
          {ageHours}h waiting
        </span>
      </Link>
    </li>
  );
}

function ActivityRow({ request, now }: { request: ValuationRequest; now: number }) {
  const ago = relativeTime(now - +new Date(request.updated_at));
  return (
    <li>
      <Link
        href="/admin/valuation-requests"
        className="group flex items-center justify-between gap-4 py-3 transition hover:bg-ink-900/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-white">
            {request.first_name} {request.last_name}
            <span className="ml-2 text-[10px] uppercase tracking-luxe text-gold-tint">
              {VALUATION_STATUS_LABELS[request.status as ValuationRequestStatus] ??
                request.status.replace(/_/g, ' ')}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-warmgrey">
            {summarise(request)}
          </span>
        </span>
        <span className="whitespace-nowrap text-[10px] uppercase tracking-luxe text-warmgrey">
          {ago}
        </span>
      </Link>
    </li>
  );
}

function SpotRow({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-luxe text-warmgrey">{label}</span>
      <span className="font-display text-sm text-white">
        {value !== null ? formatGBP(value) : '—'}
        <span className="text-[10px] text-warmgrey/70">/g</span>
      </span>
    </span>
  );
}

/* ----------------------------- Helpers ----------------------------------- */

function summarise(r: ValuationRequest): string {
  const bits = [r.form_variant, r.metal_type, r.brand, r.model, r.carat]
    .filter(Boolean)
    .slice(0, 3);
  if (bits.length > 0) return bits.join(' · ');
  return r.description?.slice(0, 60) ?? '—';
}

function relativeTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listValuationRequests } from '@/lib/actions/valuationRequests';
import { getMetalSpots, spotForPurity } from '@/lib/services/metalPrice';
import { formatGBP } from '@/lib/format';
import {
  computePortfolioSnapshot,
  listHeldStockItems,
  type MetalKey,
} from '@/lib/queries/stockItems';
import { listAuditLog, type AuditLogEntry } from '@/lib/queries/auditLog';
import { SpotStaleBanner } from './_components/SpotStaleBanner';
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
  // Pull everything the dashboard needs in parallel — three independently
  // cached upstreams (Supabase, metalprice API, Supabase again) — so the
  // page renders fast even when the holdings ledger has hundreds of rows.
  const [spots, requestsRaw, heldStock, auditEntries] = await Promise.all([
    getMetalSpots(),
    isSupabaseConfigured()
      ? (listValuationRequests() as Promise<ValuationRequest[]>)
      : Promise.resolve([] as ValuationRequest[]),
    isSupabaseConfigured() ? listHeldStockItems() : Promise.resolve([]),
    isSupabaseConfigured() ? listAuditLog(5) : Promise.resolve([] as AuditLogEntry[]),
  ]);
  const requests = requestsRaw;
  const spotMap: Record<MetalKey, number | null> = {
    gold: spots.gold?.per_gram_gbp ?? null,
    silver: spots.silver?.per_gram_gbp ?? null,
    platinum: spots.platinum?.per_gram_gbp ?? null,
    palladium: spots.palladium?.per_gram_gbp ?? null,
  };
  const portfolio = computePortfolioSnapshot(heldStock, spotMap, spots.fetched_at);

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

  const goldGram = spots.gold?.per_gram_gbp ?? null;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
            Dashboard
          </span>
          <h1 className="font-display text-2xl text-white mt-1">Welcome back</h1>
        </div>
        <p className="hidden text-[10px] uppercase tracking-luxe text-warmgrey sm:block">
          Live · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </header>

      <SpotStaleBanner snapshot={spots} />

      {/* QUICK ACTIONS - the four highest-frequency entry points */}
      <section className="flex flex-wrap gap-2">
        <QuickAction href="/admin/walk-in" label="New walk-in purchase" tone="primary" />
        <QuickAction href="/admin/valuation-requests" label="Valuation requests" />
        <QuickAction href="/admin/holdings" label="Holdings ledger" />
        <QuickAction href="/admin/customers" label="Customers" />
      </section>

      {/* HERO METRICS - three self-contained stat cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric label="Today" enquiries={today.length} paid={paidIn(today)} />
        <Metric label="This week" enquiries={week.length} paid={paidIn(week)} />
        <Metric label="This month" enquiries={month.length} paid={paidIn(month)} />
      </section>

      {/* HOLDINGS + PIPELINE - two panels side by side on wide screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Holdings" action={<ViewAll href="/admin/holdings" />}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <HoldingStat label="Items held" value={portfolio.combined.count.toString()} />
            <HoldingStat
              label="Cost basis"
              value={formatGBP(portfolio.combined.total_cost_gbp)}
            />
            <HoldingStat
              label="Current value"
              value={formatGBP(portfolio.combined.total_current_value_gbp)}
              sub={
                portfolio.spot_fetched_at
                  ? `Spot · ${new Date(portfolio.spot_fetched_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Live spot unavailable'
              }
            />
            <HoldingStat
              label="Unrealised P&L"
              value={`${formatGBPSigned(portfolio.combined.pl_gbp)} · ${formatPct(portfolio.combined.pl_pct)}`}
              tone={portfolio.combined.pl_gbp >= 0 ? 'positive' : 'negative'}
            />
          </div>
        </Panel>

        <Panel title="Pipeline" action={<ViewAll href="/admin/valuation-requests" />}>
          <ol className="flex items-center gap-1 overflow-x-auto pb-1">
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
        </Panel>
      </div>

      {/* NEEDS ATTENTION + RECENT ACTIVITY - paired panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Needs your attention">
          {needsAction.length > 0 ? (
            <ul className="divide-y divide-gold-metallic/10">
              {needsAction.map((r) => (
                <AttentionRow key={r.id} request={r} now={now} />
              ))}
            </ul>
          ) : (
            <p className="text-[12px] leading-relaxed text-warmgrey">
              Nothing waiting - every new enquiry has been picked up within the last 18 hours.
            </p>
          )}
        </Panel>

        <Panel title="Recent admin activity">
          {auditEntries.length > 0 ? (
            <ul className="divide-y divide-gold-metallic/10">
              {auditEntries.map((e) => (
                <AuditRow key={e.id} entry={e} now={now} />
              ))}
              <li className="pt-3">
                <Link
                  href="/admin/audit-log"
                  className="text-[10px] uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
                >
                  View full audit log →
                </Link>
              </li>
            </ul>
          ) : (
            <p className="text-[12px] leading-relaxed text-warmgrey">
              Nothing logged yet - the audit trail starts collecting from the next admin write.
            </p>
          )}
        </Panel>
      </div>

      {/* LIVE SPOT - gold carats on top row, other metals on bottom */}
      <Panel title="Live spot">
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <span className="w-20 text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
              Gold
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
          </div>
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <span className="w-20 text-[10px] font-semibold uppercase tracking-luxe text-warmgrey">
              Other metals
            </span>
            <SpotRow label="Silver" value={spotMap.silver} />
            <SpotRow label="Platinum" value={spotMap.platinum} />
            <SpotRow label="Palladium" value={spotMap.palladium} />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ----------------------------- Components -------------------------------- */

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="gc-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-[10px] uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
    >
      View all →
    </Link>
  );
}

function Metric({
  label,
  enquiries,
  paid,
}: {
  label: string;
  enquiries: number;
  paid: number;
}) {
  return (
    <div className="gc-card p-5">
      <p className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        {label}
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold text-white">
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

function QuickAction({
  href,
  label,
  tone = 'default',
}: {
  href: string;
  label: string;
  tone?: 'default' | 'primary';
}) {
  const base =
    'inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-luxe transition';
  const theme =
    tone === 'primary'
      ? 'border-gold-metallic bg-gold-metallic/20 text-gold-bright shadow-[0_0_14px_-4px_rgba(212,175,55,0.55)] hover:bg-gold-metallic/30'
      : 'border-gold-metallic/30 text-gold-tint hover:border-gold-metallic hover:bg-gold-metallic/10 hover:text-gold-bright';
  return (
    <Link href={href} className={`${base} ${theme}`}>
      {label}
    </Link>
  );
}

function HoldingStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-luxe text-warmgrey">
        {label}
      </p>
      <p
        className={
          'mt-1 font-display text-xl ' +
          (tone === 'negative'
            ? 'text-red-300'
            : tone === 'positive'
            ? 'text-emerald-300'
            : 'text-white')
        }
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] uppercase tracking-luxe text-warmgrey/70">{sub}</p>}
    </div>
  );
}

function AuditRow({ entry, now }: { entry: AuditLogEntry; now: number }) {
  const ago = relativeTime(now - +new Date(entry.created_at));
  const summary = entry.note ?? `${entry.action.replace(/_/g, ' ')} · ${entry.entity_type}`;
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-white">{summary}</span>
        <span className="whitespace-nowrap text-[10px] uppercase tracking-luxe text-warmgrey">
          {ago}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-warmgrey">
        <span className="text-warmgrey/70">{entry.entity_type.replace(/_/g, ' ')}</span>
        {entry.actor_email && (
          <>
            <span className="text-warmgrey/40"> · </span>
            <span>{entry.actor_email}</span>
          </>
        )}
      </div>
    </li>
  );
}

function formatGBPSigned(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${formatGBP(n)}`;
}

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
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

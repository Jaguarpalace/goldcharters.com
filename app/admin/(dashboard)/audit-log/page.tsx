import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listAuditLog } from '@/lib/queries/auditLog';

export const dynamic = 'force-dynamic';

const ENTITY_LABELS: Record<string, string> = {
  valuation_request: 'Valuation request',
  stock_item: 'Stock item',
  customer: 'Customer',
  customer_document: 'Customer document',
  page_seo: 'Page SEO',
  legal_page: 'Legal page',
  form_option: 'Form option',
  site_settings: 'Site settings',
  homepage_section: 'Homepage section',
};

const ACTION_TONES: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  update: 'bg-sky-500/15 text-sky-300 ring-sky-500/40',
  delete: 'bg-red-500/15 text-red-300 ring-red-500/40',
  mark_reviewed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  record_sale: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  unmark_sale: 'bg-amber-500/15 text-amber-300 ring-amber-500/40',
  change_status: 'bg-violet-500/15 text-violet-300 ring-violet-500/40',
  upload_document: 'bg-sky-500/15 text-sky-300 ring-sky-500/40',
  delete_document: 'bg-red-500/15 text-red-300 ring-red-500/40',
  add_to_holdings: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  walk_in_purchase: 'bg-gold-metallic/20 text-gold-bright ring-gold-metallic/50',
};

export default async function AdminAuditLogPage() {
  const entries = isSupabaseConfigured() ? await listAuditLog(200) : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">History</span>
        <h1 className="mt-1 font-display text-3xl text-white">Audit Log</h1>
        <p className="mt-1 max-w-3xl text-xs text-warmgrey">
          Append-only trail of every meaningful admin write — status changes, sales recorded,
          settings edited, documents deleted, customers updated. Shown newest first, capped at
          the last 200 events. Older events are still in the database (use Supabase SQL to
          query further back).
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view audit history.
        </div>
      )}

      {entries.length === 0 ? (
        <p className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
          Nothing logged yet. The audit log starts collecting events from the next admin write.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const tone =
              ACTION_TONES[e.action] ?? 'bg-warmgrey/15 text-warmgrey ring-warmgrey/40';
            return (
              <li
                key={e.id}
                className="grid items-start gap-2 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-3 md:grid-cols-[180px,140px,1fr,180px]"
              >
                <div>
                  <div className="text-[12px] text-white">
                    {new Date(e.created_at).toLocaleString('en-GB')}
                  </div>
                  <div className="text-[10px] text-warmgrey">
                    {timeAgo(e.created_at)}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe ring-1 ${tone}`}
                  >
                    {e.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] uppercase tracking-luxe text-warmgrey">
                    {ENTITY_LABELS[e.entity_type] ?? e.entity_type}
                  </span>
                </div>
                <div>
                  {e.note && <div className="text-[13px] text-white">{e.note}</div>}
                  {e.entity_id && (
                    <div className="text-[10px] text-warmgrey">
                      <span className="text-warmgrey/70">id:</span>{' '}
                      <code className="font-mono">{e.entity_id}</code>
                    </div>
                  )}
                  {(e.before || e.after) && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] uppercase tracking-luxe text-gold-tint hover:text-gold-bright">
                        Snapshot
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-ink-950/80 p-2 text-[10px] leading-relaxed text-warmgrey">
                        {JSON.stringify({ before: e.before, after: e.after }, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-white">
                    {e.actor_email ?? <span className="text-warmgrey/70">system</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

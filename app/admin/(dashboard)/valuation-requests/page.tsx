import Link from 'next/link';
import { listValuationRequests } from '@/lib/actions/valuationRequests';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import {
  VALUATION_STATUS_LABELS,
  type ValuationRequest,
  type ValuationRequestImage,
  type ValuationRequestStatus,
} from '@/types/database';
import { StatusPipeline } from './StatusPipeline';

type Row = ValuationRequest & { valuation_request_images?: ValuationRequestImage[] };

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  new: 'text-amber-300 ring-amber-500/40 bg-amber-500/10',
  contacted: 'text-sky-300 ring-sky-500/40 bg-sky-500/10',
  valued: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10',
  offer_sent: 'text-violet-300 ring-violet-500/40 bg-violet-500/10',
  booked: 'text-cyan-300 ring-cyan-500/40 bg-cyan-500/10',
  bought: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10',
  completed: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10',
  rejected: 'text-red-300 ring-red-500/40 bg-red-500/10',
};

export default async function AdminValuationRequestsPage() {
  const requests = (await listValuationRequests()) as Row[];

  return (
    <div className="space-y-8">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Enquiries</span>
        <h1 className="font-display text-4xl text-white mt-2">Valuation Requests</h1>
        <p className="mt-2 max-w-2xl text-sm text-warmgrey">
          Customer submissions with uploaded photos. Update status as you progress through the workflow.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Connect Supabase to view real submissions. In demo mode, form submissions are validated and
          logged but not persisted.
        </div>
      )}

      {requests.length === 0 ? (
        <div className="gc-card p-10 text-center text-sm text-warmgrey">
          No requests yet. They&apos;ll appear here as customers submit the public valuation form.
        </div>
      ) : (
        <ul className="space-y-4">
          {requests.map((r) => {
            const photos = r.valuation_request_images ?? [];
            const badge = STATUS_BADGE[r.status] ?? 'text-warmgrey ring-warmgrey/30';
            return (
              <li key={r.id} className="gc-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-luxe text-gold-tint">
                      {new Date(r.created_at).toLocaleString('en-GB')}
                    </p>
                    <h3 className="font-display text-xl text-white mt-1">
                      {r.first_name} {r.last_name}
                    </h3>
                    <p className="mt-1 text-sm text-warmgrey">
                      <Link href={`mailto:${r.email}`} className="hover:text-gold-bright">
                        {r.email}
                      </Link>{' '}
                      ·{' '}
                      <Link href={`tel:${r.phone}`} className="hover:text-gold-bright">
                        {r.phone}
                      </Link>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe ring-1 ${badge}`}
                  >
                    {VALUATION_STATUS_LABELS[r.status as ValuationRequestStatus] ?? r.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <StatusPipeline
                  requestId={r.id}
                  currentStatus={r.status as ValuationRequestStatus}
                />

                {r.form_variant && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-gold-gradient px-3 py-1 text-[10px] font-semibold uppercase tracking-luxe text-ink-950">
                    {r.form_variant} branch
                  </p>
                )}
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                  {r.metal_type && <Field label="Metal" value={r.metal_type} />}
                  {r.item_category && <Field label="Form" value={r.item_category} />}
                  {r.jewellery_type && <Field label="Type" value={r.jewellery_type} />}
                  {r.gemstone && <Field label="Gemstone" value={r.gemstone} />}
                  {r.brand && <Field label="Brand" value={r.brand} />}
                  {r.model && <Field label="Model" value={r.model} />}
                  {r.condition && <Field label="Condition" value={r.condition} />}
                  {r.box_papers && <Field label="Box / papers" value={r.box_papers} />}
                  <Field label="Item type" value={r.item_type.replace(/_/g, ' ')} />
                  <Field label="Weight" value={r.weight_grams ? `${r.weight_grams} g` : '—'} />
                  <Field label="Carat" value={r.carat ?? '—'} />
                  <Field label="Contact via" value={r.preferred_contact_method} />
                </dl>

                {r.description && (
                  <p className="mt-4 whitespace-pre-line text-sm text-warmgrey">{r.description}</p>
                )}

                {photos.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-luxe text-gold-tint">
                      Uploaded photos ({photos.length})
                    </p>
                    <ul className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                      {photos.map((p) => (
                        <li key={p.id}>
                          <a href={p.image_url} target="_blank" rel="noreferrer noopener">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.image_url}
                              alt={p.file_name ?? 'Uploaded photo'}
                              className="aspect-square w-full rounded-lg border border-gold-metallic/20 object-cover"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-luxe text-gold-tint">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}

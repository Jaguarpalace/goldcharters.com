'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  deleteAppointment,
  updateAppointmentStatus,
  type AppointmentWithEvent,
} from '@/lib/actions/appointments';
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from '@/types/database';
import { formatSlotLong } from '@/lib/appointments/slots';

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  booked: 'border-gold-metallic/40 bg-ink-950/40 text-gold-bright',
  confirmed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  attended: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  cancelled: 'border-warmgrey/30 bg-ink-800 text-warmgrey',
  no_show: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
};

export function AppointmentsBoard({ initial }: { initial: AppointmentWithEvent[] }) {
  const [rows, setRows] = useState<AppointmentWithEvent[]>(initial);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: AppointmentWithEvent[] = [];
    const old: AppointmentWithEvent[] = [];
    for (const r of rows) {
      const future = new Date(r.starts_at).getTime() >= now;
      if (future && r.status !== 'cancelled' && r.status !== 'no_show') up.push(r);
      else old.push(r);
    }
    up.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    old.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
    return { upcoming: up, past: old };
  }, [rows]);

  const setStatus = (id: string, status: AppointmentStatus) => {
    setFeedback(null);
    setRows((list) => list.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(async () => {
      const res = await updateAppointmentStatus(id, status);
      if (!res.ok) setFeedback({ kind: 'err', text: res.error });
    });
  };

  const remove = (id: string) => {
    if (!confirm('Permanently delete this booking?')) return;
    startTransition(async () => {
      const res = await deleteAppointment(id);
      if (res.ok) setRows((list) => list.filter((r) => r.id !== id));
      else setFeedback({ kind: 'err', text: res.error });
    });
  };

  return (
    <div className="space-y-8">
      {feedback && (
        <p className={'text-sm ' + (feedback.kind === 'ok' ? 'text-gold-tint' : 'text-amber-400')}>
          {feedback.text}
        </p>
      )}

      <Group title={`Upcoming (${upcoming.length})`} rows={upcoming} onStatus={setStatus} onDelete={remove} pending={pending} emptyText="No upcoming appointments." />
      <Group title={`Past & cancelled (${past.length})`} rows={past} onStatus={setStatus} onDelete={remove} pending={pending} emptyText="Nothing here yet." muted />
    </div>
  );
}

function Group({
  title,
  rows,
  onStatus,
  onDelete,
  pending,
  emptyText,
  muted,
}: {
  title: string;
  rows: AppointmentWithEvent[];
  onStatus: (id: string, status: AppointmentStatus) => void;
  onDelete: (id: string) => void;
  pending: boolean;
  emptyText: string;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-luxe text-gold-tint">{title}</h2>
      <ul className={'mt-4 space-y-3 ' + (muted ? 'opacity-90' : '')}>
        {rows.length === 0 && (
          <li className="gc-card p-6 text-center text-sm text-warmgrey">{emptyText}</li>
        )}
        {rows.map((r) => (
          <li key={r.id} className="gc-card flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">
                  {r.first_name} {r.last_name}
                </span>
                <span className={'rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-luxe ' + STATUS_STYLES[r.status]}>
                  {APPOINTMENT_STATUS_LABELS[r.status]}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-white">{formatSlotLong(r.starts_at)}</p>
              <p className="mt-0.5 text-[12px] text-gold-tint">
                {r.appointment_events?.title ?? '—'}
                {r.appointment_events?.city ? ` · ${r.appointment_events.city}` : ''}
              </p>
              <p className="mt-2 text-[12px] text-warmgrey">
                <a href={`mailto:${r.email}`} className="hover:text-gold-bright">{r.email}</a>
                {' · '}
                <a href={`tel:${r.phone.replace(/\s+/g, '')}`} className="hover:text-gold-bright">{r.phone}</a>
                {' · prefers '}
                {r.preferred_contact_method}
              </p>
              {r.service_type && <p className="mt-1 text-[12px] text-warmgrey">Bringing: {r.service_type}</p>}
              {r.notes && <p className="mt-1 text-[12px] text-warmgrey/80">“{r.notes}”</p>}
            </div>

            <div className="flex flex-row items-center gap-2 lg:flex-col lg:items-end">
              <select
                value={r.status}
                disabled={pending}
                onChange={(e) => onStatus(r.id, e.target.value as AppointmentStatus)}
                className="gc-input max-w-[150px] py-1.5 text-[13px]"
              >
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-ink-950 text-white">
                    {APPOINTMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onDelete(r.id)} disabled={pending} className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-amber-300">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

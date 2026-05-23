'use client';

import { useState, useTransition } from 'react';
import {
  VALUATION_PIPELINE,
  VALUATION_STATUS_LABELS,
  type ValuationRequestStatus,
} from '@/types/database';
import { updateValuationStatus } from '@/lib/actions/valuationRequests';

/**
 * Visual progress pipeline + status updater for a single valuation request.
 *
 * The five "happy path" stages run left-to-right:
 *   New → Contacted → Valuation Sent → Booked → Bought
 *
 * "Rejected" is a separate terminal state shown as a small destructive button.
 * Legacy statuses ('valued', 'completed') map onto the closest stage so old
 * data still renders sensibly.
 */
export function StatusPipeline({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: ValuationRequestStatus;
}) {
  const [status, setStatus] = useState<ValuationRequestStatus>(currentStatus);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Map any legacy statuses onto the new pipeline so the visual flow is consistent.
  const displayStatus = mapLegacy(status);
  const currentIndex = VALUATION_PIPELINE.indexOf(displayStatus);
  const isRejected = status === 'rejected';

  const setTo = (next: ValuationRequestStatus) => {
    setError(null);
    const previous = status;
    setStatus(next); // optimistic
    startTransition(async () => {
      const result = await updateValuationStatus(requestId, next);
      if (!result.ok) {
        setStatus(previous);
        setError(result.error);
      }
    });
  };

  return (
    <div className="mt-4">
      <ol className="grid grid-cols-5 gap-1">
        {VALUATION_PIPELINE.map((stage, i) => {
          const reached = !isRejected && i <= currentIndex;
          const active = !isRejected && i === currentIndex;
          return (
            <li key={stage}>
              <button
                type="button"
                disabled={pending}
                onClick={() => setTo(stage)}
                className={
                  'group flex w-full flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-wait ' +
                  (active
                    ? 'border-gold-metallic bg-gold-gradient text-ink-950 shadow-[0_0_12px_rgba(212,175,55,0.35)]'
                    : reached
                      ? 'border-gold-metallic/40 bg-ink-900/60 text-gold-tint'
                      : 'border-gold-metallic/15 bg-ink-900/40 text-warmgrey/70 hover:border-gold-metallic/40 hover:text-warmgrey')
                }
              >
                <span className="text-[9px] uppercase tracking-luxe opacity-80">
                  Stage {i + 1}
                </span>
                <span className="text-[11px] font-semibold leading-tight">
                  {VALUATION_STATUS_LABELS[stage]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-warmgrey">
          Current:{' '}
          <span className={isRejected ? 'text-red-300' : 'text-gold-tint'}>
            {VALUATION_STATUS_LABELS[status]}
          </span>
        </span>
        {!isRejected ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setTo('rejected')}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
          >
            Mark rejected
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setTo('new')}
            className="text-[10px] uppercase tracking-luxe text-gold-metallic hover:text-gold-bright"
          >
            Reopen
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-300">
          {error}
        </p>
      )}
    </div>
  );
}

function mapLegacy(s: ValuationRequestStatus): ValuationRequestStatus {
  if (s === 'valued') return 'offer_sent';
  if (s === 'completed') return 'bought';
  return s;
}

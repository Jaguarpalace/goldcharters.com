'use client';

import { useState, useTransition } from 'react';

/**
 * Standardised "Danger zone" delete block. Two-step confirm prevents stray
 * clicks; inline feedback surfaces server errors without a layout shift.
 *
 * Accepts an async onConfirm() that returns { ok, error } so the calling
 * page can keep its existing delete server action without modification.
 */
export function DangerZone({
  title = 'Danger zone',
  description,
  confirmLabel = 'Confirm delete',
  triggerLabel = 'Delete',
  onConfirm,
  onDeleted,
}: {
  title?: string;
  description: string;
  confirmLabel?: string;
  triggerLabel?: string;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Optional callback fired after a successful delete (e.g. router.push). */
  onDeleted?: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        onDeleted?.();
      } else {
        setError(result.error);
        setArmed(false);
      }
    });
  };

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-luxe text-red-300/90">
        {title}
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-warmgrey">{description}</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        {error && <p className="mr-auto text-[11px] text-amber-400">{error}</p>}
        {armed ? (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/25 disabled:opacity-50"
            >
              {pending ? 'Removing…' : confirmLabel}
            </button>
            <button
              type="button"
              onClick={() => setArmed(false)}
              disabled={pending}
              className="text-[11px] uppercase tracking-luxe text-warmgrey transition hover:text-gold-bright"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="text-[11px] uppercase tracking-luxe text-warmgrey transition hover:text-red-300"
          >
            {triggerLabel}
          </button>
        )}
      </div>
    </div>
  );
}

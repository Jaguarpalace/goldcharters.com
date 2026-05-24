'use client';

import { useState, useTransition } from 'react';
import type { NotificationRecipient } from '@/types/database';
import {
  addNotificationRecipient,
  removeNotificationRecipient,
  updateNotificationRecipient,
} from '@/lib/actions/notificationRecipients';

export function NotificationsBoard({
  initialRecipients,
}: {
  initialRecipients: NotificationRecipient[];
}) {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>(initialRecipients);

  const onAdded = (r: NotificationRecipient) => setRecipients((prev) => [...prev, r]);
  const onPatched = (id: string, patch: Partial<NotificationRecipient>) =>
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const onRemoved = (id: string) =>
    setRecipients((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          {recipients.length} {recipients.length === 1 ? 'recipient' : 'recipients'}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
              <tr>
                <th className="px-3 py-2 text-left">Email / label</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="w-10 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-metallic/10">
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-10 text-center text-sm text-warmgrey">
                    No recipients yet — add the first one using the form on the right.
                  </td>
                </tr>
              ) : (
                recipients.map((r) => (
                  <RecipientRow
                    key={r.id}
                    recipient={r}
                    onPatched={(patch) => onPatched(r.id, patch)}
                    onRemoved={() => onRemoved(r.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <AddRecipientForm onAdded={onAdded} />
      </aside>
    </div>
  );
}

/* ------------------------------- Row ------------------------------------- */

function RecipientRow({
  recipient,
  onPatched,
  onRemoved,
}: {
  recipient: NotificationRecipient;
  onPatched: (patch: Partial<NotificationRecipient>) => void;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggle = () => {
    setFeedback(null);
    const next = !recipient.enabled;
    startTransition(async () => {
      const result = await updateNotificationRecipient(recipient.id, { enabled: next });
      if (result.ok) onPatched({ enabled: next });
      else setFeedback(result.error);
    });
  };

  const remove = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await removeNotificationRecipient(recipient.id);
      if (result.ok) onRemoved();
      else {
        setFeedback(result.error);
        setConfirming(false);
      }
    });
  };

  return (
    <tr className="align-top">
      <td className="px-3 py-2.5">
        <div className="font-medium text-white">{recipient.email}</div>
        {recipient.label && (
          <div className="text-[11px] text-warmgrey">{recipient.label}</div>
        )}
        {feedback && <div className="mt-1 text-[11px] text-amber-400">{feedback}</div>}
      </td>
      <td className="px-2 py-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={recipient.enabled}
          aria-label={`Toggle alerts for ${recipient.email}`}
          disabled={pending}
          onClick={toggle}
          className={
            'relative h-5 w-9 flex-none rounded-full border transition disabled:cursor-wait ' +
            (recipient.enabled
              ? 'border-gold-metallic bg-gold-metallic/30'
              : 'border-gold-metallic/30 bg-ink-950')
          }
        >
          <span
            aria-hidden
            className={
              'absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ' +
              (recipient.enabled
                ? 'left-[18px] bg-gold-bright shadow-[0_0_8px_rgba(255,215,0,0.6)]'
                : 'left-0.5 bg-warmgrey/60')
            }
          />
        </button>
        <span className="ml-2 align-middle text-[10px] uppercase tracking-luxe text-warmgrey">
          {recipient.enabled ? 'Active' : 'Paused'}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right">
        {confirming ? (
          <span className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/20"
            >
              {pending ? 'Removing…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[10px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
          >
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}

/* ----------------------------- Add form ---------------------------------- */

function AddRecipientForm({
  onAdded,
}: {
  onAdded: (r: NotificationRecipient) => void;
}) {
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await addNotificationRecipient({
        email: email.trim(),
        label: label.trim() || null,
      });
      if (result.ok && result.data) {
        onAdded(result.data);
        setEmail('');
        setLabel('');
        setFeedback({ ok: true, text: 'Recipient added.' });
        setTimeout(() => setFeedback(null), 2000);
      } else if (!result.ok) {
        setFeedback({ ok: false, text: result.error });
      }
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-gold-metallic/25 bg-ink-900/70 p-5"
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
        Add recipient
      </h2>
      <p className="text-[11px] text-warmgrey">
        Anyone here gets the internal alert when a customer submits a valuation request. Pause
        any address to stop sending without deleting it.
      </p>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="office@chartersgold.co.uk"
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Label <span className="text-warmgrey/50">(optional)</span>
        </span>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Office shared inbox"
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between gap-2 pt-1">
        {feedback ? (
          <p className={'text-[11px] ' + (feedback.ok ? 'text-gold-tint' : 'text-amber-400')}>
            {feedback.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending || !email.trim()}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Adding…' : 'Add'}
        </button>
      </div>
    </form>
  );
}

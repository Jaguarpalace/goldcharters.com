'use client';

import { useState, useTransition } from 'react';
import type { AdminProfile } from '@/types/database';
import {
  inviteAdminUser,
  removeAdminUser,
  updateAdminUserRole,
  type TeamRole,
} from '@/lib/actions/adminUsers';

const ROLE_LABEL: Record<TeamRole, string> = {
  admin: 'Admin',
  editor: 'Staff',
};

const ROLE_DESCRIPTION: Record<TeamRole, string> = {
  admin: 'Full access - content, settings, team, payments.',
  editor: 'Content + valuation requests. Cannot manage the team.',
};

export function TeamBoard({
  initialTeammates,
  currentUserId,
}: {
  initialTeammates: AdminProfile[];
  currentUserId: string | null;
}) {
  const [team, setTeam] = useState<AdminProfile[]>(initialTeammates);

  const onInvited = (added: AdminProfile) =>
    setTeam((prev) => [...prev, added]);
  const onRoleChanged = (id: string, role: TeamRole) =>
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
  const onRemoved = (id: string) =>
    setTeam((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr,1fr]">
      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">
          {team.length} {team.length === 1 ? 'teammate' : 'teammates'}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
              <tr>
                <th className="px-3 py-2 text-left">Name / email</th>
                <th className="px-2 py-2 text-left">Role</th>
                <th className="px-2 py-2 text-left">Joined</th>
                <th className="w-10 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-metallic/10">
              {team.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-sm text-warmgrey">
                    No teammates yet. Use the form to send the first invite.
                  </td>
                </tr>
              ) : (
                team.map((m) => (
                  <TeammateRow
                    key={m.id}
                    teammate={m}
                    isCurrentUser={m.id === currentUserId}
                    onRoleChanged={(role) => onRoleChanged(m.id, role)}
                    onRemoved={() => onRemoved(m.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <InviteForm onInvited={onInvited} />
      </aside>
    </div>
  );
}

/* ------------------------------- Row ------------------------------------- */

function TeammateRow({
  teammate,
  isCurrentUser,
  onRoleChanged,
  onRemoved,
}: {
  teammate: AdminProfile;
  isCurrentUser: boolean;
  onRoleChanged: (role: TeamRole) => void;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const changeRole = (role: TeamRole) => {
    if (role === teammate.role) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateAdminUserRole(teammate.id, role);
      if (result.ok) onRoleChanged(role);
      else setFeedback(result.error);
    });
  };

  const remove = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await removeAdminUser(teammate.id);
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
        <div className="font-medium text-white">
          {teammate.full_name || teammate.email.split('@')[0]}
          {isCurrentUser && (
            <span className="ml-2 rounded-full bg-gold-metallic/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-gold-tint">
              You
            </span>
          )}
        </div>
        <div className="text-[11px] text-warmgrey">{teammate.email}</div>
        {feedback && (
          <div className="mt-1 text-[11px] text-amber-400">{feedback}</div>
        )}
      </td>
      <td className="px-2 py-2.5">
        <select
          value={teammate.role}
          disabled={pending}
          onChange={(e) => changeRole(e.target.value as TeamRole)}
          className="rounded-md border border-gold-metallic/20 bg-ink-900/70 px-2 py-1 text-[12px] text-white focus:border-gold-metallic focus:outline-none disabled:cursor-wait"
        >
          <option value="admin">Admin</option>
          <option value="editor">Staff</option>
        </select>
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-[11px] text-warmgrey">
        {new Date(teammate.created_at).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td className="whitespace-nowrap px-2 py-2.5 text-right">
        {isCurrentUser ? (
          <span className="text-[10px] uppercase tracking-luxe text-warmgrey/50">—</span>
        ) : confirming ? (
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
            className="text-[10px] uppercase tracking-luxe text-warmgrey transition hover:text-red-300"
          >
            Remove
          </button>
        )}
      </td>
    </tr>
  );
}

/* ----------------------------- Invite form ------------------------------- */

function InviteForm({ onInvited }: { onInvited: (m: AdminProfile) => void }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<TeamRole>('editor');
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteAdminUser({
        email: email.trim(),
        full_name: fullName.trim(),
        role,
      });
      if (result.ok) {
        // Optimistically push into the list. Server will reconcile on refresh.
        onInvited({
          id: `pending-${Date.now()}`,
          email: email.trim().toLowerCase(),
          full_name: fullName.trim() || null,
          role,
          created_at: new Date().toISOString(),
        });
        setEmail('');
        setFullName('');
        setRole('editor');
        setFeedback({ ok: true, text: 'Invitation sent.' });
      } else {
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
        Invite teammate
      </h2>
      <p className="text-[11px] text-warmgrey">
        We’ll send a one-time sign-in link to their email. They set their own password on first
        sign-in.
      </p>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="teammate@chartersgold.co.uk"
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Full name <span className="text-warmgrey/50">(optional)</span>
        </span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Sarah Smith"
          className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
      </label>

      <div className="block">
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          Role
        </span>
        <div className="mt-1 space-y-1">
          {(['admin', 'editor'] as TeamRole[]).map((r) => (
            <label
              key={r}
              className={
                'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 transition ' +
                (role === r
                  ? 'border-gold-metallic bg-gold-metallic/10'
                  : 'border-gold-metallic/15 bg-ink-950/40 hover:border-gold-metallic/40')
              }
            >
              <input
                type="radio"
                name="role"
                value={r}
                checked={role === r}
                onChange={() => setRole(r)}
                className="mt-1 h-3 w-3 accent-gold-metallic"
              />
              <span className="flex-1">
                <span className="block text-[12px] font-semibold text-white">
                  {ROLE_LABEL[r]}
                </span>
                <span className="block text-[10px] text-warmgrey">
                  {ROLE_DESCRIPTION[r]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

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
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </div>
    </form>
  );
}

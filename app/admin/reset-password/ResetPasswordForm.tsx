'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase/client';

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Handles the recovery link, then lets the user set a new password.
 *
 * Supabase can deliver the recovery token three ways depending on how the
 * reset was requested; all three are handled:
 *   ?code=...                      PKCE flow (our "Forgot password?" link)
 *   ?token_hash=...&type=recovery  links built from the email template
 *   #access_token=...&type=recovery legacy implicit flow (dashboard-sent)
 * The browser client auto-consumes the first and last; the middle one is
 * verified explicitly below.
 */
export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setPhase('invalid');
      return;
    }
    let cancelled = false;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type');

      if (tokenHash && type === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (!cancelled) setPhase(verifyError ? 'invalid' : 'ready');
        return;
      }

      // PKCE `?code=` and implicit `#access_token` are exchanged by the client
      // on load; give it a moment and then check whether a session exists.
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) setPhase('ready');
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!cancelled) setPhase('invalid');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    if (password.length < 10) {
      setError('Use at least 10 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    // Recovery sessions are deliberately short-lived: sign out so the next
    // sign-in goes through the normal password (+ 2FA if enabled) path.
    await supabase.auth.signOut();
    setPhase('done');
    setBusy(false);
  };

  if (phase === 'checking') {
    return <p className="text-sm text-warmgrey">Checking your reset link…</p>;
  }

  if (phase === 'invalid') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          This reset link is invalid or has expired. Links work once and for a limited time.
        </p>
        <Link href="/admin/login?forgot=1" className="gc-btn-primary inline-flex w-full justify-center">
          Request a new link
        </Link>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Password updated. Sign in with your new password.
        </p>
        <Link href="/admin/login" className="gc-btn-primary inline-flex w-full justify-center">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="password" className="gc-label">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="gc-input"
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="confirm" className="gc-label">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="gc-input"
        />
      </div>
      {error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="gc-btn-primary w-full">
        {busy ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}

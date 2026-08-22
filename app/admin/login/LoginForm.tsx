'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';

type Step = 'password' | 'mfa';
type Supa = NonNullable<ReturnType<typeof getBrowserSupabase>>;

/** Only ever send people back inside the admin - never to an external URL. */
function safeNext(): string {
  if (typeof window === 'undefined') return '/admin';
  const next = new URLSearchParams(window.location.search).get('next') ?? '';
  return next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
}

/** The account's verified authenticator (TOTP) factor id, if any. */
async function findVerifiedTotpFactor(supabase: Supa): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  const verified = data.totp.find((f) => f.status === 'verified') ?? null;
  return verified?.id ?? null;
}

export function LoginForm({ initialStep = 'password' }: { initialStep?: Step }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Arriving directly at the code step (password already accepted on this
  // session) - look up which authenticator to challenge.
  useEffect(() => {
    if (initialStep !== 'mfa') return;
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    findVerifiedTotpFactor(supabase).then(setFactorId);
  }, [initialStep]);

  const finish = () => {
    router.push(safeNext());
    router.refresh();
  };

  const onPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Does this account have two-factor enabled? If so, the password alone
    // only gets us a level-1 session - ask for the authenticator code.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      setFactorId(await findVerifiedTotpFactor(supabase));
      setStep('mfa');
      setLoading(false);
      return;
    }

    finish();
  };

  const onCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    if (!factorId) {
      setError('No authenticator is registered on this account. Please sign in again.');
      return;
    }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s+/g, ''),
    });
    if (verifyError) {
      setError('That code was not accepted. Codes change every 30 seconds - enter the one showing now.');
      setLoading(false);
      return;
    }
    finish();
  };

  const startOver = async () => {
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    setCode('');
    setError(null);
    setFactorId(null);
    setStep('password');
    router.refresh();
  };

  if (step === 'mfa') {
    return (
      <form onSubmit={onCode} className="space-y-5">
        <div>
          <p className="text-sm text-white">Two-factor verification</p>
          <p className="mt-1 text-xs text-warmgrey">
            Open your authenticator app and enter the 6-digit code for Charters Gold.
          </p>
        </div>
        <div>
          <label htmlFor="code" className="gc-label">
            Authenticator code
          </label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="gc-input tracking-[0.4em] text-center text-lg"
            placeholder="000000"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading || code.replace(/\s+/g, '').length < 6} className="gc-btn-primary w-full">
          {loading ? 'Verifying…' : 'Verify & Sign In'}
        </button>
        <button
          type="button"
          onClick={startOver}
          className="w-full text-center text-xs uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
        >
          Use a different account
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onPassword} className="space-y-5">
      <div>
        <label htmlFor="email" className="gc-label">
          Email
        </label>
        <input id="email" name="email" type="email" required className="gc-input" autoComplete="email" />
      </div>
      <div>
        <label htmlFor="password" className="gc-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="gc-input"
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="gc-btn-primary w-full">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  );
}

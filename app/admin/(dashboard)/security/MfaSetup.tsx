'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase/client';

type Factor = { id: string; friendly_name?: string | null; status: 'verified' | 'unverified' };
type Enrolment = { id: string; qr: string; secret: string };

const FRIENDLY_NAME = 'Charters Gold admin';

export function MfaSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Factor | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setLoading(true);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) {
      setError(listError.message);
    } else {
      const verified = data.totp.find((f) => f.status === 'verified') ?? null;
      setActive(verified ? { id: verified.id, friendly_name: verified.friendly_name, status: 'verified' } : null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Start enrolment: creates a pending authenticator and shows its QR code. */
  const startEnrolment = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    // Tidy up any half-finished attempts so they can't pile up. (`totp` only
    // lists verified factors; pending ones live in `all`.)
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === 'totp' && f.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error: enrolError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: FRIENDLY_NAME,
    });
    if (enrolError || !data) {
      setError(
        enrolError?.message.includes('not enabled') || enrolError?.message.includes('disabled')
          ? 'Two-factor authentication is switched off for this project. Enable TOTP under Authentication → Multi-Factor in the Supabase dashboard, then try again.'
          : enrolError?.message ?? 'Could not start enrolment.',
      );
      setBusy(false);
      return;
    }
    setEnrolment({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode('');
    setBusy(false);
  };

  /** Confirm enrolment with a live code - only then does 2FA become active. */
  const confirmEnrolment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || !enrolment) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolment.id,
      code: code.replace(/\s+/g, ''),
    });
    if (verifyError) {
      setError('That code was not accepted. Check the time on your phone is set automatically, and enter the code currently showing.');
      setBusy(false);
      return;
    }
    setEnrolment(null);
    setCode('');
    setNotice('Two-factor authentication is now ON for your account. From your next sign-in you will be asked for a code from your authenticator app.');
    await load();
    setBusy(false);
    router.refresh();
  };

  /** Abandon a pending enrolment - nothing changes on the account. */
  const cancelEnrolment = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase || !enrolment) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: enrolment.id });
    setEnrolment(null);
    setCode('');
    setError(null);
    setBusy(false);
  };

  const disable = async () => {
    const supabase = getBrowserSupabase();
    if (!supabase || !active) return;
    if (
      !window.confirm(
        'Turn off two-factor authentication for your account? Your password alone will sign you in again.',
      )
    )
      return;
    setBusy(true);
    setError(null);
    const { error: unenrolError } = await supabase.auth.mfa.unenroll({ factorId: active.id });
    if (unenrolError) {
      setError(unenrolError.message);
      setBusy(false);
      return;
    }
    setNotice('Two-factor authentication has been turned off for your account.');
    await load();
    setBusy(false);
    router.refresh();
  };

  if (loading) {
    return <p className="text-xs text-warmgrey">Checking your account…</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      {notice && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </p>
      )}

      {/* Status card */}
      <div className="rounded-xl border border-gold-metallic/20 bg-ink-950 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-luxe text-gold-metallic">Two-factor authentication</p>
            <p className="mt-1 text-sm text-white">
              {active ? (
                <>
                  <span className="text-emerald-300">ON</span> - authenticator app
                  {active.friendly_name ? ` (${active.friendly_name})` : ''}
                </>
              ) : (
                <>
                  <span className="text-amber-300">OFF</span> - password only
                </>
              )}
            </p>
          </div>
          {active ? (
            <button type="button" onClick={disable} disabled={busy} className="gc-btn-secondary text-xs">
              Turn off
            </button>
          ) : (
            !enrolment && (
              <button type="button" onClick={startEnrolment} disabled={busy} className="gc-btn-primary text-xs">
                {busy ? 'Preparing…' : 'Turn on two-factor'}
              </button>
            )
          )}
        </div>
      </div>

      {/* Enrolment flow */}
      {enrolment && (
        <form onSubmit={confirmEnrolment} className="rounded-xl border border-gold-metallic/30 bg-ink-950 p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-white">Step 1 - Scan this code</p>
            <p className="mt-1 text-xs text-warmgrey">
              Open Google Authenticator, Microsoft Authenticator, Authy or any TOTP app and scan the
              QR code. Nothing is switched on until you confirm in step 2.
            </p>
            <div className="mt-3 inline-block rounded-lg bg-white p-3">
              {/* Supabase returns the QR as an SVG data URI */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrolment.qr} alt="Authenticator QR code" width={180} height={180} />
            </div>
            <details className="mt-3 text-xs text-warmgrey">
              <summary className="cursor-pointer hover:text-gold-bright">Can&rsquo;t scan? Enter the key manually</summary>
              <code className="mt-2 block break-all rounded bg-ink-900 px-3 py-2 text-[11px] text-gold-tint">
                {enrolment.secret}
              </code>
              <p className="mt-2">
                Tip: keep this key somewhere safe (a password manager). It lets you add the same
                authenticator to a second device so a lost phone never locks you out.
              </p>
            </details>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Step 2 - Confirm with a code</p>
            <p className="mt-1 text-xs text-warmgrey">
              Enter the 6-digit code the app shows for &ldquo;{FRIENDLY_NAME}&rdquo;. This proves your phone is set up correctly.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="gc-input mt-3 max-w-[12rem] tracking-[0.4em] text-center text-lg"
              placeholder="000000"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || code.replace(/\s+/g, '').length < 6}
              className="gc-btn-primary text-xs"
            >
              {busy ? 'Confirming…' : 'Confirm & turn on'}
            </button>
            <button type="button" onClick={cancelEnrolment} disabled={busy} className="gc-btn-secondary text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* How it works */}
      <div className="rounded-xl border border-gold-metallic/15 bg-ink-950/60 p-5 text-xs leading-relaxed text-warmgrey">
        <p className="font-semibold text-white">How this works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Only your own account is affected. Other team members enable it separately on their own phones.</li>
          <li>Enrolment is confirmed with a live code before it activates, so a mis-scanned QR changes nothing.</li>
          <li>Every sign-in then needs your password plus the current code. Admin actions from a session that skipped the code are refused.</li>
          <li>Changing phones: turn it off here while signed in, then turn it on again with the new device.</li>
        </ul>
      </div>
    </div>
  );
}

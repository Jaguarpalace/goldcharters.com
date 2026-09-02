import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getMfaState } from '@/lib/auth/mfa';
import { Logo } from '@/components/public/Logo';
import { MfaSetup } from '../(dashboard)/security/MfaSetup';

export const metadata = {
  title: 'Set Up Two-Factor',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Mandatory 2FA onboarding. Every admin account must have an authenticator
 * before it can use the admin - the dashboard layout redirects any
 * unenrolled session here, and this page redirects everyone else away, so
 * the two can never loop.
 */
export default async function Setup2faPage() {
  if (!isSupabaseConfigured()) redirect('/admin/login');
  const supabase = getServerSupabase();
  if (!supabase) redirect('/admin/login');

  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/admin/login');

  const mfa = await getMfaState(supabase);
  if (mfa.enrolled && mfa.verified) redirect('/admin');
  if (mfa.enrolled && !mfa.verified) redirect('/admin/login?mfa=1');

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 35%, rgba(212,175,55,0.10), transparent 65%)',
        }}
      />
      <div className="relative mx-auto max-w-2xl px-5 py-12">
        <div className="text-center">
          <Logo businessName="Charters Gold" size="default" href="/" />
          <div className="mt-8">
            <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
              One-Time Setup
            </span>
            <h1 className="mt-2 font-display text-3xl text-white sm:text-4xl">
              Secure Your Account
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-warmgrey">
              Two-factor authentication is required for every admin account. Scan the code with an
              authenticator app on your phone and confirm - it takes about a minute, once.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <MfaSetup mode="onboarding" />
        </div>
      </div>
    </main>
  );
}

import { Logo } from '@/components/public/Logo';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Landing page for password-recovery links. Sits outside the (dashboard)
 * group so it renders without the admin chrome or its auth gate - the
 * visitor is, by definition, not able to sign in yet.
 */
export default function ResetPasswordPage() {
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
      <div className="relative grid min-h-screen place-items-center px-5 py-12">
        <div className="w-full max-w-sm text-center">
          <Logo businessName="Charters Gold" size="default" href="/" />
          <div className="mt-8">
            <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
              Admin Access
            </span>
            <h1 className="font-display text-3xl text-white mt-2 sm:text-4xl">Reset Password</h1>
            <p className="mt-2 text-xs text-warmgrey">Choose a new password for your admin account.</p>
          </div>
          <div className="mt-8 gc-card gc-card-gold-edge p-7 text-left">
            {isSupabaseConfigured() ? (
              <ResetPasswordForm />
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Password reset is temporarily unavailable.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

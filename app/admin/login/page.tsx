import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { Logo } from '@/components/public/Logo';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Admin Login',
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = getServerSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user) redirect('/admin');
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950">
      {/* Soft radial glow centred behind the card - subtle, premium */}
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
          {/* Brand */}
          <Logo businessName="Charters Gold" size="default" href="/" />

          {/* Heading */}
          <div className="mt-8">
            <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
              Admin Access
            </span>
            <h1 className="font-display text-3xl text-white mt-2 sm:text-4xl">Sign In</h1>
            <p className="mt-2 text-xs text-warmgrey">Authorised personnel only.</p>
          </div>

          {/* Card */}
          <div className="mt-8 gc-card gc-card-gold-edge p-7 text-left">
            {isSupabaseConfigured() ? (
              <LoginForm />
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                Sign-in is temporarily unavailable. Please try again shortly.
              </div>
            )}
          </div>

          {/* Footer link back to public site */}
          <p className="mt-6 text-[10px] uppercase tracking-luxe text-warmgrey">
            <a href="/" className="hover:text-gold-bright">
              ← Back to chartersgold.co.uk
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

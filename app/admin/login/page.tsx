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
    <main className="flex min-h-screen items-center justify-center bg-ink-950 p-6">
      <div className="w-full max-w-md text-center sm:text-left">
        <div className="mb-6 flex justify-center sm:justify-start">
          <Logo businessName="Charters Gold" size="default" href="/" />
        </div>
        <p className="text-xs uppercase tracking-luxe text-gold-metallic">Admin Access</p>
        <h1 className="font-display text-4xl text-white mt-2">Sign In</h1>
        <p className="mt-2 text-sm text-warmgrey">
          Authorised personnel only. Sessions are tied to Supabase Auth.
        </p>

        <div className="mt-8 gc-card gc-card-gold-edge p-7">
          {isSupabaseConfigured() ? (
            <LoginForm />
          ) : (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Supabase is not configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code> to enable login.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import { isSupabaseConfigured } from '@/lib/supabase/env';
import { MfaSetup } from './MfaSetup';

export const dynamic = 'force-dynamic';

export default function AdminSecurityPage() {
  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Account</span>
        <h1 className="font-display text-2xl text-white mt-1">Security</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Two-factor authentication adds a second step to sign-in: your password plus a 6-digit code
          from an authenticator app on your phone. It applies only to the account that enables it -
          each team member sets it up on their own device.
        </p>
      </header>

      {isSupabaseConfigured() ? (
        <MfaSetup />
      ) : (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Security settings are unavailable in preview mode.
        </div>
      )}
    </div>
  );
}

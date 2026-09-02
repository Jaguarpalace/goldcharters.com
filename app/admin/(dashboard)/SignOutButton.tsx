'use client';

import { useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase/client';

/** Sidebar sign-out - ends the session and returns to the login page. */
export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    const supabase = getBrowserSupabase();
    if (supabase) await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="mt-2 w-full rounded-lg border border-gold-metallic/25 px-3 py-2 text-xs font-semibold uppercase tracking-luxe text-warmgrey transition hover:border-gold-metallic hover:text-gold-bright disabled:opacity-50"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

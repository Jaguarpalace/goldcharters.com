'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Supabase password-recovery links fall back to the project's Site URL (the
 * homepage) whenever their redirect target isn't on the allow-list - e.g.
 * resets sent from the Supabase dashboard. The token then sits unused in the
 * address bar. This forwards any such visit to the reset page, preserving
 * the token (hash fragment or query string) so it can be consumed there.
 */
export function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    const { hash, search } = window.location;
    const isRecovery =
      /[#&?]type=recovery(&|$)/.test(hash) ||
      /[#&?]type=recovery(&|$)/.test(search) ||
      (hash.includes('access_token=') && hash.includes('type=recovery'));
    // Supabase PKCE codes are UUIDs - anything else (e.g. a promo ?code=) is ignored.
    const hasPkceCode = /[?&]code=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(&|$)/i.test(search);
    if (!isRecovery && !hasPkceCode) return;
    router.replace(`/admin/reset-password${search}${hash}`);
  }, [pathname, router]);

  return null;
}

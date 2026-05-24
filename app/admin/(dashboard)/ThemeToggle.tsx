'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export type AdminTheme = 'dark' | 'light';

const COOKIE = 'admin-theme';

/** Sun / moon toggle that flips between dark and light admin themes by
 * writing a cookie and asking the server to re-render. */
export function ThemeToggle({ current }: { current: AdminTheme }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next: AdminTheme = current === 'light' ? 'dark' : 'light';
    // 1 year max-age, restricted to /admin so the public site never receives it.
    document.cookie = `${COOKIE}=${next}; path=/admin; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    startTransition(() => router.refresh());
  };

  const isLight = current === 'light';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      title={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-gold-metallic/25 bg-ink-900/70 px-2 text-[10px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:border-gold-metallic hover:text-gold-bright disabled:opacity-60"
    >
      {isLight ? (
        // Moon — switch to dark
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun — switch to light
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
      {isLight ? 'Dark mode' : 'Light mode'}
    </button>
  );
}

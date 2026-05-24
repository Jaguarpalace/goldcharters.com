'use client';

import { openConsentSettings } from '@/lib/consent/consent';

/**
 * Lightweight client button that re-opens the consent banner from anywhere
 * (legal page, footer, blog post body, etc.) without needing prop drilling.
 */
export function CookiePreferencesButton({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className={
        className ??
        'inline-flex items-center gap-2 rounded-full border border-gold-metallic/50 bg-transparent px-4 py-2 text-[12px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:border-gold-metallic hover:text-gold-bright'
      }
    >
      {children ?? 'Manage cookie preferences'}
    </button>
  );
}

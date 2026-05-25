'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Client-side shell that turns the (server-rendered) admin sidebar into a
 * proper mobile experience:
 *   - On lg+ (desktop): static 260px rail on the left, content on the right
 *   - Below lg (tablet / phone): collapses into a top-bar with a hamburger.
 *     Tap the hamburger to slide in a drawer containing the same sidebar
 *     content. Tap the backdrop or any nav link to dismiss.
 *
 * The sidebar content itself is passed in as a prop (`sidebar`) so we keep
 * server data fetching (auth, outstanding count, theme) in the parent
 * layout — this client component just owns the open/closed state.
 */
export function AdminShell({
  sidebar,
  children,
}: {
  /** Pre-rendered sidebar content (server component output) */
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes (clicking a nav link).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open]);

  return (
    <>
      {/* MOBILE TOPBAR — visible below lg, sticky so it stays put on scroll */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-gold-metallic/15 bg-ink-950/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={
            'inline-flex h-10 w-10 items-center justify-center rounded-md border transition ' +
            (open
              ? 'border-gold-metallic bg-gold-metallic/15 text-gold-bright shadow-[0_0_12px_-2px_rgba(212,175,55,0.5)]'
              : 'border-gold-metallic/25 text-gold-metallic hover:border-gold-metallic hover:text-gold-bright')
          }
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic">
          Charters Gold · Admin
        </span>
        <span className="w-10" aria-hidden /> {/* keeps the title centred */}
      </header>

      {/* DESKTOP RAIL — visible lg+ only */}
      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-[260px] lg:flex-col lg:overflow-y-auto lg:border-r lg:border-gold-metallic/15 lg:bg-ink-900/80 lg:p-6">
        {sidebar}
      </aside>

      {/* MOBILE DRAWER — slides in from the left */}
      <div
        aria-hidden={!open}
        className={
          'fixed inset-0 z-40 transition lg:hidden ' +
          (open ? 'visible opacity-100' : 'invisible opacity-0')
        }
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
        />
        {/* Drawer panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className={
            'absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto border-r border-gold-metallic/20 bg-ink-900 p-5 shadow-[0_0_60px_-10px_rgba(212,175,55,0.4)] transition-transform duration-300 ease-out ' +
            (open ? 'translate-x-0' : '-translate-x-full')
          }
        >
          {/* Close button in top-right of the drawer */}
          <div className="mb-2 flex items-center justify-end">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gold-metallic/25 text-warmgrey transition hover:border-gold-metallic hover:text-gold-bright"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {sidebar}
        </div>
      </div>

      {/* CONTENT — full width on mobile, left-padded to clear the rail on lg+ */}
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:ml-[260px] lg:px-8 lg:py-8">
        {children}
      </div>
    </>
  );
}

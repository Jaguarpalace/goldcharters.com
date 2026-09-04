'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavLink } from './NavLink';

export type NavSectionItem = {
  href: string;
  label: string;
  inactive?: boolean;
  badgeCount?: number;
  badgeTitle?: string;
};

export type NavSection = {
  key: string;
  title: string;
  items: NavSectionItem[];
};

const STORAGE_KEY = 'admin-nav-open';
const DEFAULT_OPEN: Record<string, boolean> = { trading: true };

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Collapsible sidebar sections. Open/closed state persists per browser;
 * the section containing the current page opens itself so nobody is ever
 * lost inside a closed group, and badge counts bubble up to a collapsed
 * section's header so a waiting lead can't hide.
 */
export function NavSections({
  overview,
  sections,
  flat = false,
}: {
  overview: NavSectionItem;
  sections: NavSection[];
  /** Managers get few items - render them as one flat list, no headers. */
  flat?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>(DEFAULT_OPEN);

  // Load persisted state after mount (avoids SSR/client mismatch).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setOpen({ ...DEFAULT_OPEN, ...JSON.parse(stored) });
    } catch {
      /* ignore - defaults stand */
    }
  }, []);

  // Ensure the section holding the current page is open. Runs on navigation;
  // the user can still collapse it manually afterwards.
  useEffect(() => {
    const activeSection = sections.find((s) => s.items.some((i) => isItemActive(pathname, i.href)));
    if (!activeSection) return;
    setOpen((prev) => (prev[activeSection.key] ? prev : { ...prev, [activeSection.key]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const renderItem = (item: NavSectionItem) => (
    <li key={item.href}>
      <NavLink
        href={item.href}
        label={item.label}
        inactive={item.inactive}
        inactiveTitle="Shop is disabled - click to view paused tools"
        badge={item.badgeCount && item.badgeCount > 0 ? <Badge count={item.badgeCount} title={item.badgeTitle} /> : null}
      />
    </li>
  );

  if (flat) {
    return (
      <ul className="space-y-1 text-sm">
        {renderItem(overview)}
        {sections.flatMap((s) => s.items.map(renderItem))}
      </ul>
    );
  }

  return (
    <ul className="space-y-1 text-sm">
      {renderItem(overview)}
      {sections.map((section) => {
        const isOpen = !!open[section.key];
        const hiddenBadgeTotal = isOpen
          ? 0
          : section.items.reduce((sum, i) => sum + (i.badgeCount ?? 0), 0);
        return (
          <li key={section.key} className="pt-2 first:pt-0">
            <button
              type="button"
              onClick={() => toggle(section.key)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-luxe text-gold-metallic/80 transition hover:bg-ink-900/60 hover:text-gold-bright"
            >
              <span className="flex items-center gap-2">
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden
                  className={'transition-transform ' + (isOpen ? 'rotate-90' : '')}
                >
                  <path d="M3 1.5 7 5 3 8.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {section.title}
              </span>
              {hiddenBadgeTotal > 0 && <Badge count={hiddenBadgeTotal} title="Items waiting inside" />}
            </button>
            {isOpen && <ul className="mt-1 space-y-1 pl-2">{section.items.map(renderItem)}</ul>}
          </li>
        );
      })}
    </ul>
  );
}

function Badge({ count, title }: { count: number; title?: string }) {
  return (
    <span
      className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-ink-950"
      style={{
        background: 'linear-gradient(135deg, #FFD700, #B8860B)',
        boxShadow: '0 0 8px rgba(212,175,55,0.55)',
      }}
      title={title}
    >
      {count}
    </span>
  );
}

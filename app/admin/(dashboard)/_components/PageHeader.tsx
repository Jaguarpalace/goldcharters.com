import type { ReactNode } from 'react';
import { AdminBreadcrumbs } from './AdminBreadcrumbs';

/**
 * Standard admin detail-page header: optional breadcrumbs, gold eyebrow,
 * display title, optional subtitle and right-aligned action slot.
 *
 * Adopting this across detail pages keeps the visual rhythm identical so
 * the admin always knows what they're looking at and what they can do.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: Array<{ href?: string; label: string }>;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && <AdminBreadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <span className="text-xs uppercase tracking-luxe text-gold-metallic">
              {eyebrow}
            </span>
          )}
          <h1 className="mt-1 font-display text-2xl text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-xs text-warmgrey">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

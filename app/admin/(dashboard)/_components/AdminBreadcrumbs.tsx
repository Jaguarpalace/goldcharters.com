import Link from 'next/link';

/**
 * Subtle, gold-tinted breadcrumb trail rendered at the top of admin
 * detail pages. Mirrors the look of the public site's eyebrows so the
 * admin still feels like the same product.
 */
export function AdminBreadcrumbs({
  items,
}: {
  /** Ordered list, root → current. Last item is rendered as plain text. */
  items: Array<{ href?: string; label: string }>;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-luxe text-gold-metallic"
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={`${item.label}-${idx}`} className="inline-flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link href={item.href} className="transition hover:text-gold-bright">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-warmgrey' : ''}>{item.label}</span>
            )}
            {!isLast && (
              <span aria-hidden className="text-gold-metallic/50">
                ›
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

import type { ProductStatus } from '@/types/database';

const STATUS_META: Record<ProductStatus, { label: string; tone: string }> = {
  active: { label: 'In Stock', tone: 'text-emerald-300 ring-emerald-500/30' },
  reserved: { label: 'Reserved', tone: 'text-amber-300 ring-amber-500/40' },
  sold: { label: 'Sold', tone: 'text-warmgrey ring-warmgrey/30' },
  out_of_stock: { label: 'Out of Stock', tone: 'text-warmgrey ring-warmgrey/30' },
  hidden: { label: 'Hidden', tone: 'text-warmgrey ring-warmgrey/30' },
  draft: { label: 'Draft', tone: 'text-warmgrey ring-warmgrey/30' },
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-ink-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-luxe ring-1 ${meta.tone}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { ProductCategory } from '@/types/database';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price · Low to High' },
  { value: 'price-desc', label: 'Price · High to Low' },
  { value: 'featured', label: 'Featured' },
];

export function ProductFilters({
  categories,
  total,
}: {
  categories: ProductCategory[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const activeCategory = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const search = params.get('search') ?? '';
  const inStockOnly = params.get('in_stock') === '1';

  const updateParam = useCallback(
    (next: Record<string, string | null>) => {
      const newParams = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === '') newParams.delete(key);
        else newParams.set(key, value);
      }
      router.push(`/shop?${newParams.toString()}`);
    },
    [params, router],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-warmgrey">
          <span className="font-display text-lg text-white">{total}</span> piece{total === 1 ? '' : 's'} in our
          current collection
        </p>
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-luxe text-gold-tint">Sort</label>
          <select
            value={sort}
            onChange={(e) => updateParam({ sort: e.target.value })}
            className="gc-input max-w-xs py-2"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-ink-950">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          defaultValue={search}
          placeholder="Search the collection…"
          onChange={(e) => updateParam({ search: e.target.value })}
          className="gc-input flex-1"
        />
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-warmgrey">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam({ in_stock: e.target.checked ? '1' : null })}
            className="h-4 w-4 accent-gold-metallic"
          />
          In-stock only
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill
          active={activeCategory === ''}
          onClick={() => updateParam({ category: null })}
        >
          All
        </FilterPill>
        {categories.map((cat) => (
          <FilterPill
            key={cat.id}
            active={activeCategory === cat.slug}
            onClick={() => updateParam({ category: cat.slug })}
          >
            {cat.name}
          </FilterPill>
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-luxe transition ' +
        (active
          ? 'bg-gold-gradient text-ink-950 shadow-[0_0_14px_rgba(212,175,55,0.4)]'
          : 'border border-gold-metallic/30 text-warmgrey hover:text-gold-bright')
      }
    >
      {children}
    </button>
  );
}

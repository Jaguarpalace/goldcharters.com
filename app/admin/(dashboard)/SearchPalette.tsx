'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { globalSearch, type SearchHit } from '@/lib/actions/globalSearch';

/**
 * Cmd / Ctrl + K-activated palette that searches across every searchable
 * admin entity (customers, valuation requests, holdings, blog, products).
 *
 * - Opens with Cmd+K (mac) or Ctrl+K (Windows / Linux)
 * - Closes with Esc, backdrop click, or after navigation
 * - Debounces the server action call so typing stays smooth
 * - Arrow keys + Enter navigate / select
 */
const ENTITY_BADGE: Record<SearchHit['entity'], string> = {
  customer: 'Customer',
  valuation_request: 'Enquiry',
  stock_item: 'Holdings',
  blog_post: 'Blog',
  product: 'Product',
};

const ENTITY_TONE: Record<SearchHit['entity'], string> = {
  customer: 'bg-sky-500/15 text-sky-300 ring-sky-500/40',
  valuation_request: 'bg-violet-500/15 text-violet-300 ring-violet-500/40',
  stock_item: 'bg-gold-metallic/15 text-gold-bright ring-gold-metallic/40',
  blog_post: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40',
  product: 'bg-amber-500/15 text-amber-300 ring-amber-500/40',
};

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* Global hotkey: Cmd/Ctrl+K toggles, Esc closes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isToggle) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (open && e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /* Autofocus the input when the palette opens; reset when closed. */
  useEffect(() => {
    if (open) {
      // Give the dialog a tick to mount before focusing.
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery('');
      setHits([]);
      setActiveIndex(0);
    }
  }, [open]);

  /* Debounced search — wait ~140ms after typing pauses, then call. */
  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        const next = await globalSearch(query);
        setHits(next);
        setActiveIndex(0);
      });
    }, 140);
    return () => clearTimeout(id);
  }, [query, open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  /* Arrow navigation + Enter selection inside the palette */
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (hits.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) navigate(hit.href);
    }
  };

  return (
    <>
      {/* Compact trigger pinned in the admin top-bar / nav header so the
          palette is discoverable even for users who don't know the shortcut. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Search (Cmd/Ctrl + K)"
        className="inline-flex w-full items-center gap-2 rounded-md border border-gold-metallic/25 bg-ink-900/60 px-3 py-1.5 text-left text-[12px] text-warmgrey transition hover:border-gold-metallic hover:text-gold-bright"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="flex-none"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span className="flex-1">Search</span>
        <kbd className="rounded border border-gold-metallic/30 px-1.5 py-0.5 font-mono text-[9px] text-warmgrey/80">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          aria-hidden={!open}
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
        >
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Global search"
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-gold-metallic/30 bg-ink-900 shadow-[0_30px_90px_-20px_rgba(212,175,55,0.35)]"
          >
            <div className="flex items-center gap-3 border-b border-gold-metallic/15 px-4 py-3">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="flex-none text-gold-tint"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Search customers, enquiries, holdings, blog posts…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-warmgrey/60 focus:outline-none"
              />
              {pending && (
                <span className="text-[10px] uppercase tracking-luxe text-warmgrey">
                  Searching…
                </span>
              )}
              <kbd className="rounded border border-gold-metallic/30 px-1.5 py-0.5 font-mono text-[9px] text-warmgrey/80">
                Esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-[12px] text-warmgrey">
                  Type at least 2 characters to search.
                </p>
              ) : hits.length === 0 && !pending ? (
                <p className="px-4 py-8 text-center text-[12px] text-warmgrey">
                  No matches for "{query}".
                </p>
              ) : (
                <ul>
                  {hits.map((hit, idx) => (
                    <li key={`${hit.entity}-${hit.id}`}>
                      <Link
                        href={hit.href}
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={
                          'flex items-center justify-between gap-3 px-4 py-3 transition ' +
                          (idx === activeIndex
                            ? 'bg-gold-metallic/10 text-white'
                            : 'text-warmgrey hover:bg-ink-800/60 hover:text-white')
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe ring-1 ${ENTITY_TONE[hit.entity]}`}
                            >
                              {ENTITY_BADGE[hit.entity]}
                            </span>
                            <span className="truncate text-[13px] text-white">
                              {hit.title}
                            </span>
                          </div>
                          {hit.subtitle && (
                            <div className="mt-0.5 truncate text-[11px] text-warmgrey">
                              {hit.subtitle}
                            </div>
                          )}
                        </div>
                        {hit.meta && (
                          <span className="whitespace-nowrap text-[10px] uppercase tracking-luxe text-warmgrey/80">
                            {hit.meta}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gold-metallic/15 bg-ink-950/60 px-4 py-2 text-[10px] uppercase tracking-luxe text-warmgrey">
              <span>
                <kbd className="rounded border border-gold-metallic/30 px-1 font-mono text-[9px]">
                  ↑↓
                </kbd>{' '}
                navigate
              </span>
              <span>
                <kbd className="rounded border border-gold-metallic/30 px-1 font-mono text-[9px]">
                  ↵
                </kbd>{' '}
                open
              </span>
              <span>
                <kbd className="rounded border border-gold-metallic/30 px-1 font-mono text-[9px]">
                  Esc
                </kbd>{' '}
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

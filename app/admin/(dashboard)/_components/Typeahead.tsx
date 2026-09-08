'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Async autocomplete input. The caller owns the text value; this component
 * debounces it, asks `search` for matches, and renders them in a dropdown
 * with keyboard navigation. Selecting a row calls `onSelect` and closes.
 *
 * Used for returning customers on the walk-in form and buyers on the sale
 * form - anywhere "start typing, pick the existing record" is the job.
 */
export function Typeahead<T>({
  value,
  onChange,
  onSelect,
  search,
  renderItem,
  getKey,
  label,
  placeholder,
  required,
  disabled,
  minChars = 2,
  autoFocus,
  emptyHint,
}: {
  value: string;
  onChange: (next: string) => void;
  onSelect: (item: T) => void;
  search: (query: string) => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
  getKey: (item: T) => string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  minChars?: number;
  autoFocus?: boolean;
  /** Shown under the list when the query returned nothing. */
  emptyHint?: string;
}) {
  const [results, setResults] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const listId = useId();

  // Debounced lookup. A stale response (typed further since) is ignored.
  useEffect(() => {
    const q = value.trim();
    if (q.length < minChars) {
      setResults([]);
      setSearched(false);
      return;
    }
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      try {
        const rows = await search(q);
        if (id !== requestId.current) return;
        setResults(rows);
        setSearched(true);
        setActive(0);
      } catch {
        if (id === requestId.current) setResults([]);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [value, minChars, search]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (item: T) => {
    onSelect(item);
    setOpen(false);
    setResults([]);
  };

  const showList = open && value.trim().length >= minChars && (results.length > 0 || (searched && emptyHint));

  return (
    <div ref={rootRef} className="relative block">
      {label && (
        <span className="text-[10px] font-medium uppercase tracking-luxe text-warmgrey">
          {label}
          {!required && <span className="ml-1 text-warmgrey/50">(optional)</span>}
        </span>
      )}
      <input
        type="text"
        role="combobox"
        aria-expanded={!!showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList || results.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        className="mt-1 w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none disabled:opacity-60"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border border-gold-metallic/30 bg-ink-950 shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
        >
          {results.map((item, idx) => (
            <li
              key={getKey(item)}
              role="option"
              aria-selected={idx === active}
              onMouseDown={(e) => {
                // mousedown (not click) so the input's blur doesn't close the
                // list before the selection registers.
                e.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(idx)}
              className={
                'cursor-pointer px-3 py-2 text-sm ' +
                (idx === active ? 'bg-gold-metallic/15 text-white' : 'text-warmgrey hover:text-white')
              }
            >
              {renderItem(item)}
            </li>
          ))}
          {results.length === 0 && emptyHint && (
            <li className="px-3 py-2 text-[11px] text-warmgrey/70">{emptyHint}</li>
          )}
        </ul>
      )}
    </div>
  );
}

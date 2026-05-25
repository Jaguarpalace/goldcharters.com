'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import {
  VALUATION_PIPELINE,
  VALUATION_STATUS_LABELS,
  type ValuationRequest,
  type ValuationRequestImage,
  type ValuationRequestStatus,
} from '@/types/database';
import {
  bulkDeleteValuationRequests,
  bulkUpdateValuationStatus,
  deleteValuationRequest,
  type RequestNextActions,
} from '@/lib/actions/valuationRequests';
import { buildValuationsCsv, downloadCsv } from './csv';
import { RequestDetail } from './RequestDetail';

type Row = ValuationRequest & {
  valuation_request_images?: ValuationRequestImage[];
  next_actions: RequestNextActions;
};

const STATUS_BADGE: Record<string, string> = {
  new: 'text-amber-300 ring-amber-500/40 bg-amber-500/10',
  contacted: 'text-sky-300 ring-sky-500/40 bg-sky-500/10',
  valued: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10',
  offer_sent: 'text-violet-300 ring-violet-500/40 bg-violet-500/10',
  booked: 'text-cyan-300 ring-cyan-500/40 bg-cyan-500/10',
  bought: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10',
  completed: 'text-emerald-300 ring-emerald-500/40 bg-emerald-500/10',
  rejected: 'text-red-300 ring-red-500/40 bg-red-500/10',
};

/** All statuses available in the filter + bulk dropdowns. */
const ALL_STATUSES: ValuationRequestStatus[] = [
  'new',
  'contacted',
  'offer_sent',
  'booked',
  'bought',
  'rejected',
];

export function RequestsBoard({ initialRequests }: { initialRequests: Row[] }) {
  // Local mirror of the server data so we can do optimistic updates after a
  // notes save, payment save or bulk status change without forcing a refetch.
  const [rows, setRows] = useState<Row[]>(initialRequests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ValuationRequestStatus>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkPending, startBulk] = useTransition();
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  /** Tracks whether the bulk-delete "Confirm" button is showing.
   * Two-step pattern stops a stray click from wiping selected rows. */
  const [bulkDeleteArmed, setBulkDeleteArmed] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        r.brand,
        r.model,
        r.metal_type,
        r.jewellery_type,
        r.gemstone,
        r.item_category,
        r.form_variant,
        r.notes,
        r.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, statusFilter]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const visibleSelectedCount = filtered.filter((r) => selected.has(r.id)).length;

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      const next = new Set(selected);
      filtered.forEach((r) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach((r) => next.add(r.id));
      setSelected(next);
    }
  };

  const clearSelection = () => setSelected(new Set());

  const patchRow = (id: string, patch: Partial<ValuationRequest>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const applyBulkDelete = () => {
    setBulkFeedback(null);
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    // Optimistically remove the rows so the table updates instantly.
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    setBulkDeleteArmed(false);
    if (expandedId && selected.has(expandedId)) setExpandedId(null);
    startBulk(async () => {
      const result = await bulkDeleteValuationRequests(ids);
      if (result.ok) {
        setBulkFeedback(`${result.deleted} deleted`);
        setTimeout(() => setBulkFeedback(null), 2000);
      } else {
        setBulkFeedback(result.error);
        // Roll back on failure.
        setRows(initialRequests);
      }
    });
  };

  const deleteSingleRequest = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    if (expandedId === id) setExpandedId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    startBulk(async () => {
      const result = await deleteValuationRequest(id);
      if (!result.ok) {
        setBulkFeedback(result.error);
        setRows(initialRequests);
      }
    });
  };

  const applyBulkStatus = (status: ValuationRequestStatus) => {
    setBulkFeedback(null);
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    // Optimistic
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
    startBulk(async () => {
      const result = await bulkUpdateValuationStatus(ids, status);
      if (result.ok) {
        setBulkFeedback(`${result.updated} updated`);
        setSelected(new Set());
        setTimeout(() => setBulkFeedback(null), 2000);
      } else {
        setBulkFeedback(result.error);
        // Roll back by trusting initial server data — easiest safe option.
        setRows(initialRequests);
      }
    });
  };

  const exportCsv = () => {
    const csv = buildValuationsCsv(filtered);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `valuation-requests-${stamp}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gold-metallic/20 bg-ink-900/60 px-3 py-2">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, brand, model, notes…"
            className="w-full rounded-md border border-gold-metallic/20 bg-ink-950/60 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
          />
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-warmgrey/70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ValuationRequestStatus)}
          className="rounded-md border border-gold-metallic/20 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white focus:border-gold-metallic focus:outline-none"
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {VALUATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <span className="text-[11px] uppercase tracking-luxe text-warmgrey">
          {filtered.length} of {rows.length}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold-metallic/40 bg-ink-900 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-ink-800 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40"
            title="Download current view as CSV"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Bulk action bar — appears only when there's a selection */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold-metallic/50 bg-gold-metallic/[0.08] px-3 py-2">
          <span className="text-[11px] uppercase tracking-luxe text-gold-tint">
            {selected.size} selected{visibleSelectedCount !== selected.size && (
              <span className="text-warmgrey/70"> · {visibleSelectedCount} visible</span>
            )}
          </span>
          <span className="text-[11px] text-warmgrey/80">Set status to:</span>
          <div className="flex flex-wrap gap-1">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={bulkPending}
                onClick={() => applyBulkStatus(s)}
                className="rounded-md border border-gold-metallic/30 bg-ink-900 px-2.5 py-1 text-[11px] text-white transition hover:border-gold-metallic hover:bg-ink-800 disabled:cursor-wait disabled:opacity-50"
              >
                {VALUATION_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {bulkFeedback && (
            <span className="text-[11px] text-gold-tint">{bulkFeedback}</span>
          )}

          {/* Bulk delete — two-step confirm so a stray click can't wipe data */}
          {bulkDeleteArmed ? (
            <span className="ml-auto inline-flex items-center gap-1">
              <button
                type="button"
                disabled={bulkPending}
                onClick={applyBulkDelete}
                className="rounded-md border border-red-500/60 bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/25 disabled:cursor-wait disabled:opacity-50"
              >
                {bulkPending ? 'Deleting…' : `Confirm delete ${selected.size}`}
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteArmed(false)}
                disabled={bulkPending}
                className="text-[11px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
              >
                Cancel
              </button>
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setBulkDeleteArmed(true)}
                className="ml-auto text-[11px] uppercase tracking-luxe text-warmgrey transition hover:text-red-300"
                title="Permanently delete selected requests"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
          No requests yet. They’ll appear here as customers submit the public valuation form.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-10 text-center text-sm text-warmgrey">
          No requests match this search. Try different keywords or clear the status filter.
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE — full table on lg+; horizontal scroll within
              the wrapper if a tablet is narrower than the min-width. */}
          <div className="hidden overflow-x-auto rounded-lg border border-gold-metallic/15 lg:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all visible"
                      className="h-3.5 w-3.5 accent-gold-metallic"
                    />
                  </th>
                  <th scope="col" className="px-2 py-2 text-left">Submitted</th>
                  <th scope="col" className="px-2 py-2 text-left">Customer</th>
                  <th scope="col" className="px-2 py-2 text-left">Item</th>
                  <th scope="col" className="px-2 py-2 text-left">Status</th>
                  <th scope="col" className="w-8 px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-metallic/10">
                {filtered.map((r) => (
                  <RequestRow
                    key={r.id}
                    request={r}
                    selected={selected.has(r.id)}
                    expanded={expandedId === r.id}
                    onSelect={() => toggleSelect(r.id)}
                    onToggleExpand={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    onPatch={(patch) => patchRow(r.id, patch)}
                    onDelete={() => deleteSingleRequest(r.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS — stacked layout for phones / small tablets,
              same data + expanded-detail behaviour as the table. */}
          <ul className="space-y-2 lg:hidden">
            <li className="flex items-center justify-between px-1 pb-1 text-[10px] uppercase tracking-luxe text-warmgrey">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all visible"
                  className="h-3.5 w-3.5 accent-gold-metallic"
                />
                <span>Select all</span>
              </label>
              <span>{filtered.length} shown</span>
            </li>
            {filtered.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                selected={selected.has(r.id)}
                expanded={expandedId === r.id}
                onSelect={() => toggleSelect(r.id)}
                onToggleExpand={() => setExpandedId(expandedId === r.id ? null : r.id)}
                onPatch={(patch) => patchRow(r.id, patch)}
                onDelete={() => deleteSingleRequest(r.id)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* -------------------------- Single row ---------------------------------- */

function RequestRow({
  request,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
  onPatch,
  onDelete,
}: {
  request: Row;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onPatch: (patch: Partial<ValuationRequest>) => void;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[request.status] ?? 'text-warmgrey ring-warmgrey/30';
  const summary = buildItemSummary(request);
  const photoCount = request.valuation_request_images?.length ?? 0;

  return (
    <>
      <tr
        className={
          'group cursor-pointer transition ' +
          (expanded ? 'bg-ink-900/60' : 'hover:bg-ink-900/40')
        }
        onClick={onToggleExpand}
      >
        <td className="px-3 py-2.5 align-top" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label={`Select ${request.first_name} ${request.last_name}`}
            className="h-3.5 w-3.5 accent-gold-metallic"
          />
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 align-top text-[12px]">
          <div className="text-white">
            {new Date(request.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
            })}
          </div>
          <div className="text-[10px] text-warmgrey">
            {new Date(request.created_at).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </td>
        <td className="px-2 py-2.5 align-top">
          <div className="font-medium text-white">
            {request.first_name} {request.last_name}
          </div>
          <div className="text-[11px] text-warmgrey">
            <span className="truncate">{request.email}</span>
            <span className="text-warmgrey/50"> · </span>
            <span className="whitespace-nowrap">{request.phone}</span>
          </div>
          <NextActionPills request={request} />
        </td>
        <td className="px-2 py-2.5 align-top">
          <div className="text-white">{summary.primary}</div>
          {summary.secondary && (
            <div className="text-[11px] text-warmgrey">
              {summary.secondary}
              {photoCount > 0 && (
                <span className="text-gold-tint"> · {photoCount} photo{photoCount === 1 ? '' : 's'}</span>
              )}
            </div>
          )}
          {summary.secondary === null && photoCount > 0 && (
            <div className="text-[11px] text-gold-tint">
              {photoCount} photo{photoCount === 1 ? '' : 's'}
            </div>
          )}
        </td>
        <td className="whitespace-nowrap px-2 py-2.5 align-top">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-luxe ring-1 ${badge}`}
          >
            {VALUATION_STATUS_LABELS[request.status as ValuationRequestStatus] ??
              request.status.replace(/_/g, ' ')}
          </span>
          {request.payment_amount !== null && (
            <div className="mt-1 text-[10px] text-gold-tint">
              £{Number(request.payment_amount).toLocaleString('en-GB')}
            </div>
          )}
        </td>
        <td className="px-2 py-2.5 align-top text-right">
          <svg
            className={
              'inline-block h-4 w-4 text-warmgrey transition group-hover:text-gold-tint ' +
              (expanded ? 'rotate-180' : '')
            }
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <RequestDetail request={request} onPatch={onPatch} onDelete={onDelete} />
          </td>
        </tr>
      )}
    </>
  );
}

/* -------------------------- Mobile card --------------------------------- */

/** Card-style row for mobile / tablet. Same data, same expand behaviour
 *  as the desktop table row, just stacked vertically so the columns fit
 *  in a narrow viewport. */
function RequestCard({
  request,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
  onPatch,
  onDelete,
}: {
  request: Row;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onPatch: (patch: Partial<ValuationRequest>) => void;
  onDelete: () => void;
}) {
  const badge = STATUS_BADGE[request.status] ?? 'text-warmgrey ring-warmgrey/30';
  const summary = buildItemSummary(request);
  const photoCount = request.valuation_request_images?.length ?? 0;

  return (
    <li
      className={
        'overflow-hidden rounded-lg border transition ' +
        (expanded
          ? 'border-gold-metallic/40 bg-ink-900/60'
          : 'border-gold-metallic/15 bg-ink-900/40')
      }
    >
      <div
        className="flex cursor-pointer items-start gap-3 p-3"
        onClick={onToggleExpand}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${request.first_name} ${request.last_name}`}
          className="mt-1 h-3.5 w-3.5 flex-none accent-gold-metallic"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex-1 truncate font-medium text-white">
              {request.first_name} {request.last_name}
            </span>
            <span
              className={`flex-none rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-luxe ring-1 ${badge}`}
            >
              {VALUATION_STATUS_LABELS[request.status as ValuationRequestStatus] ??
                request.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="mt-1 truncate text-[11px] text-warmgrey">
            {summary.primary}
            {summary.secondary && (
              <>
                <span className="text-warmgrey/50"> · </span>
                <span>{summary.secondary}</span>
              </>
            )}
          </div>
          <NextActionPills request={request} />
          <div className="mt-1 flex items-center gap-2 text-[10px] text-warmgrey/80">
            <span>
              {new Date(request.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
              })}{' '}
              ·{' '}
              {new Date(request.created_at).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {photoCount > 0 && (
              <span className="text-gold-tint">
                · {photoCount} photo{photoCount === 1 ? '' : 's'}
              </span>
            )}
            {request.payment_amount !== null && (
              <span className="ml-auto text-gold-tint">
                £{Number(request.payment_amount).toLocaleString('en-GB')}
              </span>
            )}
          </div>
        </div>
        <svg
          className={
            'mt-1.5 h-4 w-4 flex-none text-warmgrey transition ' +
            (expanded ? 'rotate-180 text-gold-tint' : '')
          }
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <div className="border-t border-gold-metallic/15">
          <RequestDetail request={request} onPatch={onPatch} onDelete={onDelete} />
        </div>
      )}
    </li>
  );
}

/* ----------------------------- Next-action pills ------------------------ */

/**
 * Inline status hints sitting under the customer name. Each pill is a link
 * to the screen where the admin can resolve it. Hidden completely when
 * there's nothing actionable.
 *
 *   - "Add to holdings"  : status=bought + payment set + no stock row yet
 *   - "Missing KYC"      : matched customer is missing ID and/or POA docs
 *   - "Customer not linked": no customer record matched — rare since
 *                            submission now auto-links, but possible for
 *                            legacy data
 */
function NextActionPills({ request }: { request: Row }) {
  const { customer, stock_item, kyc_complete } = request.next_actions;
  const needsHoldings =
    request.status === 'bought' &&
    request.payment_amount !== null &&
    stock_item === null;
  const needsKyc = customer !== null && !kyc_complete;
  const customerMissing = customer === null;

  if (!needsHoldings && !needsKyc && !customerMissing && stock_item === null) {
    return null;
  }

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {needsHoldings && (
        <span
          title="This purchase has been paid but isn't in the holdings ledger yet"
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-amber-300 ring-1 ring-amber-500/40"
        >
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300"
          />
          Add to holdings
        </span>
      )}
      {needsKyc && customer && (
        <Link
          href={`/admin/customers/${customer.id}?tab=documents`}
          onClick={(e) => e.stopPropagation()}
          title="Customer is missing ID and/or proof of address"
          className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-red-300 ring-1 ring-red-500/40 transition hover:bg-red-500/25"
        >
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-red-300" />
          Missing KYC
        </Link>
      )}
      {customerMissing && (
        <span
          title="No matching customer record yet"
          className="inline-flex items-center gap-1 rounded-full bg-warmgrey/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-warmgrey ring-1 ring-warmgrey/30"
        >
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-warmgrey/70" />
          Customer not linked
        </span>
      )}
      {stock_item && (
        <Link
          href={`/admin/holdings/${stock_item.id}`}
          onClick={(e) => e.stopPropagation()}
          title="View the linked holdings ledger entry"
          className="inline-flex items-center gap-1 rounded-full bg-gold-metallic/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-luxe text-gold-tint ring-1 ring-gold-metallic/40 transition hover:bg-gold-metallic/25 hover:text-gold-bright"
        >
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-gold-bright" />
          {stock_item.stock_number}
        </Link>
      )}
    </div>
  );
}

/** Build the dense one-or-two-line "Item" cell summary. */
function buildItemSummary(r: ValuationRequest): { primary: string; secondary: string | null } {
  // Primary line: branch / metal / brand depending on what's filled
  if (r.form_variant === 'watch' || r.form_variant === 'handbag') {
    const branch = r.form_variant === 'watch' ? 'Watch' : 'Handbag';
    const primary = [branch, r.brand].filter(Boolean).join(' · ');
    const secondary = [r.model, r.condition, r.box_papers]
      .filter(Boolean)
      .join(' · ') || null;
    return { primary, secondary };
  }
  if (r.form_variant === 'jewellery') {
    const primary = ['Jewellery', r.jewellery_type].filter(Boolean).join(' · ');
    const secondary = [r.gemstone, r.carat ? `${r.carat} ct` : null]
      .filter(Boolean)
      .join(' · ') || null;
    return { primary, secondary };
  }
  if (r.form_variant === 'metal') {
    const primary = [r.metal_type, r.item_category].filter(Boolean).join(' · ');
    const secondary = [
      r.carat ? `${r.carat} ct` : null,
      r.weight_grams !== null ? `${r.weight_grams} g` : null,
    ]
      .filter(Boolean)
      .join(' · ') || null;
    return { primary, secondary };
  }
  // Fallback for legacy rows without form_variant
  return { primary: r.item_type.replace(/_/g, ' '), secondary: null };
}

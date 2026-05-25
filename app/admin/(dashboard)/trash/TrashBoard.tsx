'use client';

import { useState, useTransition } from 'react';
import type { Customer, StockItem, ValuationRequest } from '@/types/database';
import {
  purgeCustomer,
  restoreCustomer,
} from '@/lib/actions/customers';
import {
  purgeStockItem,
  restoreStockItem,
} from '@/lib/actions/stockItems';
import {
  purgeValuationRequest,
  restoreValuationRequest,
} from '@/lib/actions/valuationRequests';

type Tab = 'customers' | 'holdings' | 'valuations';

export function TrashBoard({
  customers,
  stockItems,
  valuationRequests,
}: {
  customers: Customer[];
  stockItems: StockItem[];
  valuationRequests: ValuationRequest[];
}) {
  const [tab, setTab] = useState<Tab>(
    customers.length > 0
      ? 'customers'
      : stockItems.length > 0
      ? 'holdings'
      : 'valuations',
  );
  const [cs, setCs] = useState(customers);
  const [si, setSi] = useState(stockItems);
  const [vr, setVr] = useState(valuationRequests);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-gold-metallic/15 pb-2">
        <TabButton active={tab === 'customers'} onClick={() => setTab('customers')}>
          Customers <span className="ml-1 text-[10px] text-warmgrey">({cs.length})</span>
        </TabButton>
        <TabButton active={tab === 'holdings'} onClick={() => setTab('holdings')}>
          Holdings <span className="ml-1 text-[10px] text-warmgrey">({si.length})</span>
        </TabButton>
        <TabButton active={tab === 'valuations'} onClick={() => setTab('valuations')}>
          Valuation requests{' '}
          <span className="ml-1 text-[10px] text-warmgrey">({vr.length})</span>
        </TabButton>
      </div>

      {tab === 'customers' && (
        <TrashList
          rows={cs}
          renderTitle={(c) =>
            `${(c as Customer).first_name} ${(c as Customer).last_name}`.trim()
          }
          renderSubtitle={(c) => (c as Customer).email}
          onRestore={async (id) => restoreCustomer(id)}
          onPurge={async (id) => purgeCustomer(id)}
          onRowRemoved={(id) => setCs((prev) => prev.filter((r) => r.id !== id))}
          deletedAtFor={(c) => (c as Customer).deleted_at ?? null}
          emptyText="No customers in the trash."
        />
      )}

      {tab === 'holdings' && (
        <TrashList
          rows={si}
          renderTitle={(s) => (s as StockItem).stock_number}
          renderSubtitle={(s) =>
            [
              (s as StockItem).metal_type,
              (s as StockItem).carat,
              (s as StockItem).description,
            ]
              .filter(Boolean)
              .join(' · ') || '—'
          }
          onRestore={async (id) => restoreStockItem(id)}
          onPurge={async (id) => purgeStockItem(id)}
          onRowRemoved={(id) => setSi((prev) => prev.filter((r) => r.id !== id))}
          deletedAtFor={(s) => (s as StockItem).deleted_at ?? null}
          emptyText="No holdings in the trash."
        />
      )}

      {tab === 'valuations' && (
        <TrashList
          rows={vr}
          renderTitle={(r) =>
            `${(r as ValuationRequest).first_name} ${(r as ValuationRequest).last_name}`.trim() ||
            (r as ValuationRequest).email
          }
          renderSubtitle={(r) =>
            [
              (r as ValuationRequest).form_variant,
              (r as ValuationRequest).brand,
              (r as ValuationRequest).model,
              (r as ValuationRequest).metal_type,
            ]
              .filter(Boolean)
              .join(' · ') || (r as ValuationRequest).email
          }
          onRestore={async (id) => restoreValuationRequest(id)}
          onPurge={async (id) => purgeValuationRequest(id)}
          onRowRemoved={(id) => setVr((prev) => prev.filter((r) => r.id !== id))}
          deletedAtFor={(r) => (r as ValuationRequest).deleted_at ?? null}
          emptyText="No valuation requests in the trash."
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------- TabButton + list */

function TabButton({
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
        'rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe transition ' +
        (active
          ? 'bg-gold-metallic/15 text-gold-bright shadow-[0_0_8px_rgba(212,175,55,0.25)]'
          : 'text-warmgrey hover:text-gold-tint')
      }
    >
      {children}
    </button>
  );
}

type Row = { id: string };

function TrashList<T extends Row>({
  rows,
  renderTitle,
  renderSubtitle,
  onRestore,
  onPurge,
  onRowRemoved,
  deletedAtFor,
  emptyText,
}: {
  rows: T[];
  renderTitle: (r: T) => string;
  renderSubtitle: (r: T) => string;
  onRestore: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onPurge: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRowRemoved: (id: string) => void;
  deletedAtFor: (r: T) => string | null;
  emptyText: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-gold-metallic/15 bg-ink-900/40 px-3 py-10 text-center text-sm text-warmgrey">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <TrashRow
          key={row.id}
          title={renderTitle(row)}
          subtitle={renderSubtitle(row)}
          deletedAt={deletedAtFor(row)}
          onRestore={() => onRestore(row.id)}
          onPurge={() => onPurge(row.id)}
          onRemoved={() => onRowRemoved(row.id)}
        />
      ))}
    </ul>
  );
}

function TrashRow({
  title,
  subtitle,
  deletedAt,
  onRestore,
  onPurge,
  onRemoved,
}: {
  title: string;
  subtitle: string;
  deletedAt: string | null;
  onRestore: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onPurge: () => Promise<{ ok: true } | { ok: false; error: string }>;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const restore = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await onRestore();
      if (result.ok) onRemoved();
      else setFeedback(result.error);
    });
  };

  const purge = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await onPurge();
      if (result.ok) onRemoved();
      else {
        setFeedback(result.error);
        setConfirmingPurge(false);
      }
    });
  };

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gold-metallic/15 bg-ink-900/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-white">{title}</div>
        <div className="mt-0.5 truncate text-[11px] text-warmgrey">{subtitle}</div>
        {deletedAt && (
          <div className="mt-0.5 text-[10px] uppercase tracking-luxe text-warmgrey/70">
            Trashed {new Date(deletedAt).toLocaleString('en-GB')}
          </div>
        )}
        {feedback && <p className="mt-1 text-[11px] text-amber-400">{feedback}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={restore}
          disabled={pending}
          className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? '…' : 'Restore'}
        </button>
        {confirmingPurge ? (
          <>
            <button
              type="button"
              onClick={purge}
              disabled={pending}
              className="rounded-md border border-red-500/60 bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-red-300 hover:bg-red-500/25 disabled:opacity-50"
            >
              {pending ? 'Removing…' : 'Confirm permanent delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingPurge(false)}
              disabled={pending}
              className="text-[11px] uppercase tracking-luxe text-warmgrey hover:text-gold-bright"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingPurge(true)}
            className="text-[11px] uppercase tracking-luxe text-warmgrey hover:text-red-300"
          >
            Permanent delete
          </button>
        )}
      </div>
    </li>
  );
}

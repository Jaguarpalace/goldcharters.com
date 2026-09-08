'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { Buyer } from '@/types/database';
import { upsertBuyer } from '@/lib/actions/buyers';
import { BuyerFields, EMPTY_BUYER, draftToInput, type BuyerDraft } from './BuyerForm';

export function BuyersBoard({ initialBuyers }: { initialBuyers: Buyer[] }) {
  const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buyers;
    return buyers.filter((b) =>
      [b.name, b.contact_name, b.email, b.phone, b.postcode, b.city]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [buyers, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, contact, email, postcode…"
          className="min-w-[220px] flex-1 rounded-md border border-gold-metallic/20 bg-ink-950/60 px-3 py-2 text-sm text-white placeholder:text-warmgrey/50 focus:border-gold-metallic focus:outline-none"
        />
        <span className="text-[10px] uppercase tracking-luxe text-gold-tint">
          {filtered.length} of {buyers.length}
        </span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-md border border-gold-metallic bg-gold-metallic/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright"
        >
          {adding ? 'Close' : 'Add buyer'}
        </button>
      </div>

      {adding && (
        <AddBuyerForm
          onCreated={(b) => {
            setBuyers((prev) => [b, ...prev].sort((x, y) => x.name.localeCompare(y.name)));
            setAdding(false);
          }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-gold-metallic/15">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ink-900/80 text-[10px] uppercase tracking-luxe text-warmgrey">
            <tr>
              <th className="px-3 py-2 text-left">Buyer</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-left">Contact</th>
              <th className="px-2 py-2 text-left">Address</th>
              <th className="px-2 py-2 text-left">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-metallic/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-warmgrey">
                  {buyers.length === 0
                    ? 'No buyers yet. They are added here or the first time you mark stock as sold.'
                    : 'No buyers match that search.'}
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr key={b.id} className="align-top hover:bg-ink-900/40">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/buyers/${b.id}`}
                      className="text-[13px] font-medium text-white hover:text-gold-bright"
                    >
                      {b.name}
                    </Link>
                    {b.company_number && (
                      <div className="text-[10px] text-warmgrey">Co. {b.company_number}</div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-[11px] uppercase tracking-luxe text-warmgrey">
                    {b.kind}
                  </td>
                  <td className="px-2 py-2.5 text-[12px] text-warmgrey">
                    {b.contact_name && <div className="text-white">{b.contact_name}</div>}
                    {b.email && <div>{b.email}</div>}
                    {b.phone && <div>{b.phone}</div>}
                  </td>
                  <td className="px-2 py-2.5 text-[12px] text-warmgrey">
                    {[b.address_line1, b.city, b.postcode].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-[11px] text-warmgrey">
                    {new Date(b.created_at).toLocaleDateString('en-GB')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddBuyerForm({ onCreated }: { onCreated: (b: Buyer) => void }) {
  const [draft, setDraft] = useState<BuyerDraft>(EMPTY_BUYER);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertBuyer(draftToInput(draft));
      if (result.ok && result.data) onCreated(result.data);
      else if (!result.ok) setFeedback(result.error);
    });
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-lg border border-gold-metallic/25 bg-ink-900/70 p-5"
    >
      <h2 className="text-[10px] font-semibold uppercase tracking-luxe text-gold-tint">New buyer</h2>
      <BuyerFields draft={draft} onChange={setDraft} />
      <div className="flex items-center justify-between gap-3">
        {feedback && <p className="text-[11px] text-amber-400">{feedback}</p>}
        <button
          type="submit"
          disabled={pending || !draft.name.trim()}
          className="ml-auto rounded-md border border-gold-metallic bg-gold-metallic/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/25 hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save buyer'}
        </button>
      </div>
    </form>
  );
}

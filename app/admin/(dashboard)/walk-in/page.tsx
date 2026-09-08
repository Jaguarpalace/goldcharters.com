import Link from 'next/link';
import { WalkInForm } from './WalkInForm';

export const dynamic = 'force-dynamic';

export default function AdminWalkInPage({
  searchParams,
}: {
  searchParams?: { ref?: string };
}) {
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-luxe text-gold-metallic">Counter sale</span>
          <h1 className="mt-1 font-display text-2xl text-white">Record a walk-in purchase</h1>
          <p className="mt-1 max-w-2xl text-xs text-warmgrey">
            For sellers who walked in without submitting the online form. This single screen
            captures the seller details, the item and the payment in one go - and creates the
            customer record, the valuation request (already marked Bought) and the holdings ledger
            row for you. On save you'll be sent straight to the printable purchase document.
          </p>
        </div>
        <div className="text-right">
          <Link
            href="/admin/valuation-requests/blank/print"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md border border-gold-metallic/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-luxe text-gold-tint transition hover:bg-gold-metallic/15 hover:text-gold-bright"
          >
            Print blank purchase document
          </Link>
          <p className="mt-1 max-w-[260px] text-[10px] text-warmgrey/70">
            For valuations away from the shop: pen-and-paper version with a reference already on
            it. Type that reference below when you enter the purchase afterwards.
          </p>
        </div>
      </header>

      <WalkInForm initialPaperRef={searchParams?.ref} />
    </div>
  );
}

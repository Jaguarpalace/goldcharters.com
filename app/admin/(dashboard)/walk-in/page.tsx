import { WalkInForm } from './WalkInForm';

export const dynamic = 'force-dynamic';

export default function AdminWalkInPage() {
  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Counter sale</span>
        <h1 className="mt-1 font-display text-2xl text-white">Record a walk-in purchase</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          For sellers who walked in without submitting the online form. This single screen
          captures the seller details, the item and the payment in one go - and creates the
          customer record, the valuation request (already marked Bought) and the holdings ledger
          row for you. On save you'll be sent straight to the printable purchase document.
        </p>
      </header>

      <WalkInForm />
    </div>
  );
}

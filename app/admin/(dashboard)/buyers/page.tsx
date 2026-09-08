import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listBuyers } from '@/lib/queries/buyers';
import { BuyersBoard } from './BuyersBoard';

export const dynamic = 'force-dynamic';

export default async function AdminBuyersPage() {
  const buyers = isSupabaseConfigured() ? await listBuyers() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Sales</span>
        <h1 className="mt-1 font-display text-2xl text-white">Buyers</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Everyone stock has been sold to - trade buyers, refiners and private individuals. A
          buyer is saved once and picked from the list on every later sale, so the invoice
          details are never typed twice.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to manage buyers.
        </div>
      )}

      <BuyersBoard initialBuyers={buyers} />
    </div>
  );
}

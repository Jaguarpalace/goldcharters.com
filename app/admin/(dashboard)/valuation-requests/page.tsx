import { listValuationRequests } from '@/lib/actions/valuationRequests';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { RequestsBoard } from './RequestsBoard';

export const dynamic = 'force-dynamic';

export default async function AdminValuationRequestsPage() {
  const requests = await listValuationRequests();

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">Enquiries</span>
        <h1 className="font-display text-2xl text-white mt-1">Valuation Requests</h1>
        <p className="mt-1 text-xs text-warmgrey">
          Search, filter and progress requests through the pipeline. Add internal notes, record
          payments and export anything to CSV.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view real submissions. In preview mode, form submissions are validated
          but not persisted.
        </div>
      )}

      <RequestsBoard initialRequests={requests} />
    </div>
  );
}

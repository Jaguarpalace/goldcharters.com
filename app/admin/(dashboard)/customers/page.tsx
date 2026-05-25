import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listCustomers } from '@/lib/queries/customers';
import { CustomersBoard } from './CustomersBoard';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = isSupabaseConfigured() ? await listCustomers() : [];

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">KYC</span>
        <h1 className="mt-1 font-display text-3xl text-white">Customers</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Directory of people we've valued or bought from. Each customer can hold ID, driving
          licence and proof-of-address documents, and shows their full enquiry history matched by
          email.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view and add customers. Preview mode does not persist edits.
        </div>
      )}

      <CustomersBoard initialCustomers={customers} />
    </div>
  );
}

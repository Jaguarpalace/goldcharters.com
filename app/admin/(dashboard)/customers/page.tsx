import { isSupabaseConfigured } from '@/lib/supabase/env';
import { listCustomerMapPoints, listCustomers } from '@/lib/queries/customers';
import { getSiteSettings } from '@/lib/queries/homepage';
import { getNap } from '@/lib/seo/nap';
import { CustomersTabs } from './CustomersTabs';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const [customers, mapPoints, settings] = await Promise.all([
    isSupabaseConfigured() ? listCustomers() : Promise.resolve([]),
    isSupabaseConfigured() ? listCustomerMapPoints() : Promise.resolve([]),
    getSiteSettings(),
  ]);
  const nap = getNap(settings);
  const shop = { lat: nap.latitude, lng: nap.longitude, label: nap.locality || settings.business_name };

  return (
    <div className="space-y-5">
      <header>
        <span className="text-xs uppercase tracking-luxe text-gold-metallic">KYC</span>
        <h1 className="mt-1 font-display text-2xl text-white">Customers</h1>
        <p className="mt-1 max-w-2xl text-xs text-warmgrey">
          Directory of people we've valued or bought from. Each customer can hold ID, driving
          licence and proof-of-address documents, and shows their full enquiry history matched by
          email. The Map tab plots every customer with a postcode.
        </p>
      </header>

      {!isSupabaseConfigured() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Connect Supabase to view and add customers. Preview mode does not persist edits.
        </div>
      )}

      <CustomersTabs
        customers={customers}
        mapPoints={mapPoints}
        shop={shop}
        initialTab={searchParams?.tab === 'map' ? 'map' : 'list'}
      />
    </div>
  );
}
